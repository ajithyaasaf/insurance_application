import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

interface CreateCustomerInput {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
}

export class CustomerService {
    async create(userId: string, role: string, data: CreateCustomerInput) {
        // Duplicate phone warning
        if (data.phone) {
            const existing = await prisma.customer.findFirst({
                where: { userId, phone: data.phone, deletedAt: null },
            });
            if (existing) {
                return {
                    customer: await prisma.customer.create({
                        data: { userId, ...data, createdBy: role, updatedBy: role },
                    }),
                    warning: `Duplicate phone: Customer "${existing.name}" already has this number`,
                };
            }
        }

        return {
            customer: await prisma.customer.create({
                data: { userId, ...data, createdBy: role, updatedBy: role },
            }),
        };
    }

    async findAll(userId: string, page = 1, limit = 20, search?: string) {
        const where: any = {
            userId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                    { email: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { policies: true, claims: true, payments: true } },
                },
            }),
            prisma.customer.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const customer = await prisma.customer.findFirst({
            where: { id, userId, deletedAt: null },
            include: {
                policies: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
                payments: { orderBy: { dueDate: 'desc' }, take: 10 },
                claims: { orderBy: { createdAt: 'desc' }, take: 10 },
                followUps: { orderBy: { nextFollowUpDate: 'desc' }, take: 10 },
            },
        });

        if (!customer) throw Object.assign(new Error('Customer not found'), { statusCode: 404 });
        return customer;
    }

    async update(userId: string, role: string, id: string, data: Partial<CreateCustomerInput>) {
        await this.findById(userId, id);
        return prisma.customer.update({ where: { id }, data: { ...data, updatedBy: role } });
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id);
        return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}

export const customerService = new CustomerService();
