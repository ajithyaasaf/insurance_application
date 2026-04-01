import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { getStartOfTodayIST, mapPaymentStatus } from '../../utils/date';

interface CreatePaymentInput {
    policyId: string;
    customerId: string;
    amount: number;
    dueDate: string;
    paidDate?: string;
    paidAmount?: number;
    status?: string;
    notes?: string;
}

export class PaymentService {
    async create(userId: string, role: string, data: CreatePaymentInput) {
        return prisma.$transaction(async (tx) => {
            // 1. Fetch the policy to validate premium bounds
            const policy = await tx.policy.findFirst({
                where: { id: data.policyId, userId },
            });
            if (!policy) throw Object.assign(new Error('Policy not found'), { statusCode: 404 });

            // 2. Validate total payment schedule does not exceed policy premium
            const existingPayments = await tx.payment.aggregate({
                where: { policyId: data.policyId },
                _sum: { amount: true },
            });
            const totalExistingAmount = existingPayments._sum.amount || 0;
            if (totalExistingAmount + data.amount > policy.premiumAmount + 0.01) {
                throw Object.assign(
                    new Error(`Total payment schedule cannot exceed policy premium (${policy.premiumAmount})`),
                    { statusCode: 400 }
                );
            }

            // 3. Derive status from paidAmount — money is the source of truth
            const paidAmount = data.paidAmount || 0;
            let initialStatus: string;
            if (paidAmount >= data.amount - 0.01 && data.amount > 0) {
                initialStatus = 'paid';
            } else if (paidAmount > 0.01) {
                initialStatus = 'partial';
            } else {
                initialStatus = data.status || 'pending';
            }

            // 4. Create the payment
            const payment = await tx.payment.create({
                data: {
                    userId,
                    policyId: data.policyId,
                    customerId: data.customerId,
                    amount: data.amount,
                    dueDate: new Date(data.dueDate),
                    paidDate: data.paidDate ? new Date(data.paidDate) : null,
                    paidAmount: data.paidAmount,
                    status: initialStatus as any,
                    notes: data.notes,
                    createdBy: role,
                },
                include: { customer: true, policy: true },
            });

            return mapPaymentStatus(payment);
        });
    }


    async findAll(
        userId: string,
        page = 1,
        limit = 20,
        status?: string,
        search?: string,
        dateFrom?: string,
        dateTo?: string,
    ) {
        const todayIST = getStartOfTodayIST();
        
        const where: any = {
            userId,
            ...(status && status !== 'overdue' && { status: status as any }),
            ...(status === 'overdue' && {
                status: { in: ['pending', 'partial'] },
                dueDate: { lt: todayIST }
            }),
            ...(search && {
                customer: { name: { contains: search, mode: 'insensitive' } },
            }),
            // ... (rest of the where clause)
            ...((dateFrom || dateTo) && {
                dueDate: {
                    ...(dateFrom && { gte: new Date(dateFrom) }),
                    ...(dateTo && { lte: new Date(dateTo) }),
                },
            }),
        };

        const [data, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { dueDate: 'desc' },
                include: { customer: true, policy: true },
            }),
            prisma.payment.count({ where }),
        ]);

        return { data: data.map(mapPaymentStatus), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const payment = await prisma.payment.findFirst({
            where: { id, userId },
            include: { customer: true, policy: true },
        });
        if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
        return mapPaymentStatus(payment);
    }

    // Update payment — supports partial payments via $transaction
    async update(userId: string, id: string, data: Partial<CreatePaymentInput>) {
        return prisma.$transaction(async (tx: any) => {
            // 1. Cross-tenant check
            const payment = await tx.payment.findFirst({
                where: { id, userId },
                include: { policy: true }
            });
            if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });

            // 2. Atomic validation for amount changes
            const currentAmount = data.amount !== undefined ? data.amount : payment.amount;
            if (data.amount !== undefined && data.amount !== payment.amount) {
                const existingPayments = await tx.payment.aggregate({
                    where: { policyId: payment.policyId, id: { not: id } },
                    _sum: { amount: true }
                });
                const totalExistingAmount = existingPayments._sum.amount || 0;
                if (totalExistingAmount + data.amount > payment.policy.premiumAmount + 0.01) {
                    throw Object.assign(new Error(`Total payment schedule cannot exceed policy premium (${payment.policy.premiumAmount})`), { statusCode: 400 });
                }
            }

            const currentPaidAmount = data.paidAmount !== undefined ? data.paidAmount : (payment.paidAmount || 0);

            if (data.paidAmount !== undefined && data.paidAmount > currentAmount + 0.01) {
                throw Object.assign(new Error('Paid amount cannot exceed the installment amount'), { statusCode: 400 });
            }

            let newStatus = data.status as any;
            let finalMessage = 'Payment updated successfully';

            // Status Logic: Money is the Source of Truth. Stored statuses: paid, partial, pending
            if (currentPaidAmount >= currentAmount - 0.01 && currentAmount > 0) {
                // Scenario 1: Fully Paid
                if (newStatus && newStatus !== 'paid') {
                    finalMessage = `Payment updated. Note: Status forced to 'paid' because full payment was received.`;
                }
                newStatus = 'paid';
            } else if (currentPaidAmount > 0.01) {
                // Scenario 2: Partial Payment
                if (newStatus && newStatus !== 'partial') {
                    finalMessage = `Payment updated. Note: Status forced to 'partial' because it is partially paid.`;
                }
                newStatus = 'partial';
            } else {
                // Scenario 3: No Payment
                if (newStatus && newStatus !== 'pending') {
                    finalMessage = `Payment updated. Note: Status set to 'pending' as no payment was recorded.`;
                }
                newStatus = 'pending';
                
                if ((payment.status === 'paid' || payment.status === 'partial') && currentPaidAmount < 0.01) {
                    finalMessage = `Payment reverted to 'pending' because paid amount was cleared.`;
                }
            }

            const updatedPayment = await tx.payment.update({
                where: { id },
                data: {
                    ...data,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    paidDate: data.paidDate ? new Date(data.paidDate) : (currentPaidAmount > 0 ? undefined : (data.paidDate === '' ? null : undefined)),
                    status: newStatus,
                },
                include: { customer: true, policy: true },
            });

            // 3. Data Consistency: Sync Policy Status
            if (updatedPayment.status !== 'paid') {
                const totalPaidAmount = await tx.payment.aggregate({
                    where: { 
                        policyId: updatedPayment.policyId, 
                        status: 'paid' 
                    },
                    _sum: { paidAmount: true }
                });

                const totalPaid = totalPaidAmount._sum.paidAmount || 0;
                
                if (totalPaid < 0.01 && updatedPayment.policy.status === 'active') {
                    // Optional: You could update policy status here if business rules require it
                }
            }

            return { payment: mapPaymentStatus(updatedPayment), message: finalMessage };
        });
    }

    async delete(userId: string, id: string) {
        await this.findById(userId, id);
        return prisma.payment.delete({ where: { id } });
    }

    // Detect and update overdue payments
    async detectOverdue(userId: string) {
        const now = new Date();
        const result = await prisma.payment.updateMany({
            where: {
                userId,
                status: 'pending',
                dueDate: { lt: now },
            },
            data: { status: 'overdue' },
        });
        return { updated: result.count };
    }
}

export const paymentService = new PaymentService();
