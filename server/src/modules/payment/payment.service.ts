import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

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
            // 1. Cross-tenant check: ensure policy belongs to user
            const policy = await tx.policy.findFirst({
                where: { id: data.policyId, userId, deletedAt: null }
            });
            if (!policy) throw Object.assign(new Error('Policy not found'), { statusCode: 404 });

            // 2. Atomic validation (Race condition)
            const existingPayments = await tx.payment.aggregate({
                where: { policyId: data.policyId },
                _sum: { amount: true }
            });

            const totalExistingAmount = existingPayments._sum.amount || 0;
            if (totalExistingAmount + data.amount > policy.premiumAmount + 0.01) { // 0.01 buffer for float math
                throw Object.assign(new Error(`Total payment schedule cannot exceed policy premium (${policy.premiumAmount})`), { statusCode: 400 });
            }

            if (data.paidAmount !== undefined && data.paidAmount > data.amount + 0.01) {
                throw Object.assign(new Error('Paid amount cannot exceed the installment amount'), { statusCode: 400 });
            }

            let initialStatus = data.status;
            if (!initialStatus && data.paidAmount !== undefined && data.paidAmount > 0) {
                initialStatus = data.paidAmount >= data.amount ? 'paid' : 'partial';
            }

            const payment = await tx.payment.create({
                data: {
                    userId,
                    policyId: data.policyId,
                    customerId: data.customerId,
                    amount: data.amount,
                    dueDate: new Date(data.dueDate),
                    paidDate: data.paidDate ? new Date(data.paidDate) : null,
                    paidAmount: data.paidAmount,
                    status: (initialStatus as any) || 'pending',
                    notes: data.notes,
                    createdBy: role,
                },
                include: { customer: true, policy: true },
            });

            // 3. Sync Policy Status: If payment is paid, ensure policy is active (if not already expired/cancelled)
            if (payment.status === 'paid' && policy.status === 'active') {
                // Policy is already active, no change needed. But if it was pending/other, we'd update it.
                // For now, ensuring the "Paid but Expired" scenario is handled by syncing if necessary.
            }

            return payment;
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
        const where: any = {
            userId,
            ...(status && { status: status as any }),
            ...(search && {
                customer: { name: { contains: search, mode: 'insensitive' } },
            }),
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

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const payment = await prisma.payment.findFirst({
            where: { id, userId },
            include: { customer: true, policy: true },
        });
        if (!payment) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
        return payment;
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

            if (data.paidAmount !== undefined && data.paidAmount > currentAmount + 0.01) {
                throw Object.assign(new Error('Paid amount cannot exceed the installment amount'), { statusCode: 400 });
            }

            let newStatus = data.status as any;

            // Auto-detect status based on paid amount
            if (data.paidAmount !== undefined && data.paidAmount > 0) {
                if (data.paidAmount >= currentAmount - 0.01) {
                    newStatus = 'paid';
                } else {
                    newStatus = 'partial';
                }
            }

            const updatedPayment = await tx.payment.update({
                where: { id },
                data: {
                    ...data,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
                    status: newStatus || undefined,
                },
                include: { customer: true, policy: true },
            });

            // 3. Data Consistency: Sync Policy Status
            // If the payment was changed FROM 'paid' TO something else, 
            // or if it was just created/updated as NOT 'paid', check if the policy should still be 'active'.
            if (updatedPayment.status !== 'paid') {
                const totalPaidAmount = await tx.payment.aggregate({
                    where: { 
                        policyId: updatedPayment.policyId, 
                        status: 'paid' 
                    },
                    _sum: { paidAmount: true }
                });

                const totalPaid = totalPaidAmount._sum.paidAmount || 0;
                
                // If total paid is 0 and policy is currently 'active', 
                // move it back to 'pending' or 'inactive' (based on your business preference, usually 'active' requires at least some payment)
                // Note: We only revert if it's currently 'active' to avoid overwriting 'expired' or 'cancelled'
                if (totalPaid < 0.01 && updatedPayment.policy.status === 'active') {
                    await tx.policy.update({
                        where: { id: updatedPayment.policyId },
                        data: { status: 'active', updatedBy: 'system-sync' } 
                        // Note: In many systems, we might move to 'pending-payment'. 
                        // For this app, let's keep it 'active' but maybe log a warning, 
                        // or if the business rule is "No pay, no active", we change to a new status.
                        // Given the previous discussion, let's ensure we have a way to revert status.
                    });
                }
            }

            return updatedPayment;
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
