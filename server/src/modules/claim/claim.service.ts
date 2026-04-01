import prisma from '../../utils/prisma';

interface CreateClaimInput {
    policyId: string;
    customerId: string;
    claimNumber?: string;
    claimAmount: number;
    claimDate: string;
    status?: string;
    reason?: string;
}

export class ClaimService {
    async create(userId: string, role: string, data: CreateClaimInput) {
        // Ownership validation for related entities
        const [policy, customer] = await Promise.all([
            prisma.policy.findFirst({ where: { id: data.policyId, userId, deletedAt: null } }),
            prisma.customer.findFirst({ where: { id: data.customerId, userId, deletedAt: null } }),
        ]);

        if (!policy) throw Object.assign(new Error('Policy not found or unauthorized'), { statusCode: 404 });
        if (!customer) throw Object.assign(new Error('Customer not found or unauthorized'), { statusCode: 404 });

        return prisma.claim.create({
            data: {
                userId,
                policyId: data.policyId,
                customerId: data.customerId,
                claimNumber: data.claimNumber,
                claimAmount: data.claimAmount,
                claimDate: new Date(data.claimDate),
                status: data.status || 'filed',
                reason: data.reason,
                createdBy: role,
            },
            include: { customer: true, policy: true },
        });
    }

    async findAll(userId: string, page = 1, limit = 20, search?: string, status?: string) {
        const where: any = {
            userId,
            ...(search && {
                customer: { name: { contains: search, mode: 'insensitive' } },
            }),
            ...(status && { status: status as any }),
        };

        const [data, total] = await Promise.all([
            prisma.claim.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { customer: true, policy: true },
            }),
            prisma.claim.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const claim = await prisma.claim.findFirst({
            where: { id, userId },
            include: { customer: true, policy: true },
        });
        if (!claim) throw Object.assign(new Error('Claim not found'), { statusCode: 404 });
        return claim;
    }

    async update(userId: string, id: string, data: Partial<CreateClaimInput>) {
        await this.findById(userId, id); // ownership check — ensures the claim belongs to this user
        return prisma.claim.update({
            where: { id },
            data: {
                ...(data.claimNumber !== undefined && { claimNumber: data.claimNumber }),
                ...(data.claimAmount !== undefined && { claimAmount: data.claimAmount }),
                ...(data.claimDate !== undefined && { claimDate: new Date(data.claimDate) }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.reason !== undefined && { reason: data.reason }),
            },
            include: { customer: true, policy: true },
        });
    }

    async delete(userId: string, id: string) {
        await this.findById(userId, id); // ownership check
        return prisma.claim.delete({ where: { id } });
    }
}

export const claimService = new ClaimService();
