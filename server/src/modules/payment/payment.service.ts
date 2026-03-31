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
        const policy = await prisma.policy.findUnique({ where: { id: data.policyId } });
        if (!policy) throw Object.assign(new Error('Policy not found'), { statusCode: 404 });

        const existingPayments = await prisma.payment.aggregate({
            where: { policyId: data.policyId },
            _sum: { amount: true }
        });

        const totalExistingAmount = existingPayments._sum.amount || 0;
        if (totalExistingAmount + data.amount > policy.premiumAmount) {
            throw Object.assign(new Error(`Total payment schedule cannot exceed policy premium (${policy.premiumAmount})`), { statusCode: 400 });
        }

        if (data.paidAmount !== undefined && data.paidAmount > data.amount) {
            throw Object.assign(new Error('Paid amount cannot exceed the installment amount'), { statusCode: 400 });
        }

        let initialStatus = data.status;
        if (!initialStatus && data.paidAmount !== undefined && data.paidAmount > 0) {
            initialStatus = data.paidAmount >= data.amount ? 'paid' : 'partial';
        }

        return prisma.payment.create({
            data: {
                userId,
                policyId: data.policyId,
                customerId: data.customerId,
                amount: data.amount,
                dueDate: new Date(data.dueDate),
                paidDate: data.paidDate ? new Date(data.paidDate) : null,
                paidAmount: data.paidAmount,
                status: (data.status as any) || 'pending',
                notes: data.notes,
                createdBy: role,
            },
            include: { customer: true, policy: true },
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
        const payment = await this.findById(userId, id);

        // Check if updating an amount would exceed total premium
        if (data.amount !== undefined && data.amount !== payment.amount) {
            const policy = await prisma.policy.findUnique({ where: { id: payment.policyId } });
            if (policy) {
                const existingPayments = await prisma.payment.aggregate({
                    where: { policyId: payment.policyId, id: { not: id } },
                    _sum: { amount: true }
                });
                const totalExistingAmount = existingPayments._sum.amount || 0;
                if (totalExistingAmount + data.amount > policy.premiumAmount) {
                    throw Object.assign(new Error(`Total payment schedule cannot exceed policy premium (${policy.premiumAmount})`), { statusCode: 400 });
                }
            }
        }

        const currentAmount = data.amount !== undefined ? data.amount : payment.amount;
        if (data.paidAmount !== undefined && data.paidAmount > currentAmount) {
            throw Object.assign(new Error('Paid amount cannot exceed the installment amount'), { statusCode: 400 });
        }

        return prisma.$transaction(async (tx: any) => {
            let newStatus = data.status as any;

            // Auto-detect status based on paid amount
            if (data.paidAmount !== undefined && data.paidAmount > 0) {
                if (data.paidAmount >= currentAmount) {
                    newStatus = 'paid';
                } else {
                    newStatus = 'partial';
                }
            }

            return tx.payment.update({
                where: { id },
                data: {
                    ...data,
                    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                    paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
                    status: newStatus || undefined,
                },
                include: { customer: true, policy: true },
            });
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
