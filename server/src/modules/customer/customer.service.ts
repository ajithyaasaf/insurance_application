import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { mapPolicyStatus } from '../../utils/date';

interface CreateCustomerInput {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    dob?: string | Date | null;
}

export class CustomerService {
    async create(userId: string, role: string, data: CreateCustomerInput) {
        // Transform dob to Date
        if (data.dob && typeof data.dob === 'string') {
            data.dob = new Date(data.dob);
        }

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
        return {
            ...customer,
            policies: customer.policies.map(mapPolicyStatus)
        };
    }

    async update(userId: string, role: string, id: string, data: Partial<CreateCustomerInput>) {
        await this.findById(userId, id);

        // Transform dob to Date
        if (data.dob && typeof data.dob === 'string') {
            data.dob = new Date(data.dob);
        }

        return prisma.customer.update({ where: { id }, data: { ...data, updatedBy: role } });
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id); // ownership check

        return prisma.$transaction(async (tx) => {
            const now = new Date();

            // 1. Get all policy IDs for this customer
            const policies = await tx.policy.findMany({
                where: { customerId: id, userId, deletedAt: null },
                select: { id: true }
            });
            const policyIds = policies.map(p => p.id);

            // 2. Delete all children of those policies
            if (policyIds.length > 0) {
                await tx.payment.deleteMany({ where: { policyId: { in: policyIds }, userId } });
                await tx.claim.deleteMany({ where: { policyId: { in: policyIds }, userId } });
                await tx.followUp.deleteMany({ where: { policyId: { in: policyIds }, userId } });
                
                // 3. Soft delete the policies themselves
                await tx.policy.updateMany({
                    where: { id: { in: policyIds }, userId },
                    data: { deletedAt: now }
                });
            }

            // 4. Soft delete the customer
            return tx.customer.update({ 
                where: { id }, 
                data: { deletedAt: now } 
            });
        });
    }
}

export const customerService = new CustomerService();
