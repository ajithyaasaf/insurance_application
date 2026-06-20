import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { mapPolicyStatus } from '../../utils/date';
import { ownerFilter } from '../../utils/rbac';

interface CreateCustomerInput {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    dob?: string | Date | null;
}

export class CustomerService {
    async create(userId: string, role: string, data: CreateCustomerInput) {
        // Clean up empty strings from frontend
        if (data.dob === '') data.dob = null;
        if (data.phone === '') data.phone = undefined;
        if (data.email === '') data.email = undefined;

        // Transform dob to Date
        if (data.dob && typeof data.dob === 'string') {
            data.dob = new Date(data.dob);
        }

        // Check duplicate phone number (Block)
        if (data.phone) {
            const existing = await prisma.customer.findMany({
                where: {
                    ...ownerFilter(userId, role),
                    phone: data.phone,
                    deletedAt: null
                },
                select: { name: true }
            });
            if (existing.length > 0) {
                const names = existing.map(c => `"${c.name}"`).join(', ');
                throw Object.assign(new Error(`Duplicate phone: Customer(s) ${names} already have this number`), { statusCode: 400 });
            }
        }

        const customer = await prisma.customer.create({
            data: { userId, ...data, createdBy: role, updatedBy: role },
        });

        return { customer };
    }

    async findAll(userId: string, role: string, page = 1, limit = 10, search?: string) {
        const where: any = {
            ...ownerFilter(userId, role),
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

    async findById(userId: string, role: string, id: string) {
        const customer = await prisma.customer.findFirst({
            where: { id, ...ownerFilter(userId, role), deletedAt: null },
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
        await this.findById(userId, role, id);

        // Clean up empty strings from frontend
        if (data.dob === '') data.dob = null;
        if (data.phone === '') data.phone = undefined;
        if (data.email === '') data.email = undefined;

        // Check duplicate phone number (excluding current customer) (Block)
        if (data.phone) {
            const existing = await prisma.customer.findMany({
                where: {
                    ...ownerFilter(userId, role),
                    phone: data.phone,
                    deletedAt: null,
                    NOT: { id },
                },
                select: { name: true }
            });
            if (existing.length > 0) {
                const names = existing.map(c => `"${c.name}"`).join(', ');
                throw Object.assign(new Error(`Duplicate phone: Customer(s) ${names} already have this number`), { statusCode: 400 });
            }
        }

        return prisma.customer.update({ where: { id }, data: { ...data, updatedBy: role } });
    }

    async softDelete(userId: string, role: string, id: string) {
        await this.findById(userId, role, id); // ownership check

        return prisma.$transaction(async (tx) => {
            const now = new Date();
            const ow = ownerFilter(userId, role);

            // 1. Get all policy IDs for this customer
            const policies = await tx.policy.findMany({
                where: { customerId: id, ...ow, deletedAt: null },
                select: { id: true }
            });
            const policyIds = policies.map(p => p.id);

            // 2. Delete all children of those policies
            if (policyIds.length > 0) {
                await tx.payment.deleteMany({ where: { policyId: { in: policyIds }, ...ow } });
                await tx.claim.deleteMany({ where: { policyId: { in: policyIds }, ...ow } });
                await tx.followUp.deleteMany({ where: { policyId: { in: policyIds }, ...ow } });

                // 3. Soft delete the policies themselves
                await tx.policy.updateMany({
                    where: { id: { in: policyIds }, ...ow },
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
