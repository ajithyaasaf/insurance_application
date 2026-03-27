import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

interface CreateLeadInput {
    name: string;
    phone?: string;
    interestedProduct?: string;
    status?: 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
    nextFollowUpDate?: string;
    notes?: string;
}

interface UpdateLeadInput {
    name?: string;
    phone?: string;
    interestedProduct?: string;
    status?: 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
    nextFollowUpDate?: string | null;
    notes?: string | null;
}

export class LeadService {
    async create(userId: string, role: string, data: CreateLeadInput) {
        return prisma.lead.create({
            data: {
                userId,
                name: data.name,
                phone: data.phone,
                interestedProduct: data.interestedProduct,
                status: data.status || 'new',
                nextFollowUpDate: data.nextFollowUpDate
                    ? new Date(data.nextFollowUpDate)
                    : null,
                notes: data.notes,
                createdBy: role,
                updatedBy: role,
            },
        });
    }

    async findAll(
        userId: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
        status?: string
    ) {
        const where: any = {
            userId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ],
            }),
            ...(status && { status: status as any }),
        };

        const [data, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.lead.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(userId: string, id: string) {
        const lead = await prisma.lead.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!lead) {
            throw Object.assign(new Error('Lead not found'), { statusCode: 404 });
        }

        return lead;
    }

    async update(userId: string, role: string, id: string, data: UpdateLeadInput) {
        await this.findById(userId, id);

        return prisma.lead.update({
            where: { id },
            data: {
                ...data,
                nextFollowUpDate: data.nextFollowUpDate
                    ? new Date(data.nextFollowUpDate)
                    : data.nextFollowUpDate === null
                        ? null
                        : undefined,
                updatedBy: role,
            },
        });
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id);

        return prisma.lead.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async convertToCustomer(
        userId: string,
        role: string,
        id: string,
        extra: { address?: string; email?: string }
    ) {
        const lead = await this.findById(userId, id);

        // Use transaction: update lead status + create customer
        const [customer] = await prisma.$transaction([
            prisma.customer.create({
                data: {
                    userId,
                    name: lead.name,
                    phone: lead.phone,
                    email: extra.email,
                    address: extra.address,
                    createdBy: role,
                    updatedBy: role,
                },
            }),
            prisma.lead.update({
                where: { id },
                data: {
                    status: 'converted',
                    updatedBy: role,
                },
            }),
        ]);

        return customer;
    }
}

export const leadService = new LeadService();
