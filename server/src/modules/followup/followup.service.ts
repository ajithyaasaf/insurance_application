import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

interface CreateFollowUpInput {
    customerId: string;
    policyId?: string;
    nextFollowUpDate: string;
    notes?: string;
    status?: string;
}

export class FollowUpService {
    async create(userId: string, role: string, data: CreateFollowUpInput) {
        return prisma.followUp.create({
            data: {
                userId,
                customerId: data.customerId,
                policyId: data.policyId || null,
                nextFollowUpDate: new Date(data.nextFollowUpDate),
                notes: data.notes,
                status: (data.status as any) || 'pending',
                createdBy: role,
            },
            include: { customer: true, policy: true },
        });
    }

    async findAll(userId: string, page = 1, limit = 20, status?: string, date?: string, search?: string) {
        const where: any = {
            userId,
            ...(status && { status: status as any }),
            ...(date && {
                nextFollowUpDate: {
                    gte: new Date(date),
                    lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
                },
            }),
            ...(search && {
                customer: { name: { contains: search, mode: 'insensitive' } },
            }),
        };

        const [data, total] = await Promise.all([
            prisma.followUp.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { nextFollowUpDate: 'asc' },
                include: { customer: true, policy: true },
            }),
            prisma.followUp.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const followUp = await prisma.followUp.findFirst({
            where: { id, userId },
            include: { customer: true, policy: true },
        });
        if (!followUp) throw Object.assign(new Error('Follow-up not found'), { statusCode: 404 });
        return followUp;
    }

    async update(userId: string, id: string, data: Partial<CreateFollowUpInput>) {
        await this.findById(userId, id);
        return prisma.followUp.update({
            where: { id },
            data: {
                ...data,
                nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : undefined,
                status: data.status as any,
            },
            include: { customer: true, policy: true },
        });
    }

    async delete(userId: string, id: string) {
        await this.findById(userId, id);
        return prisma.followUp.delete({ where: { id } });
    }
}

export const followUpService = new FollowUpService();
