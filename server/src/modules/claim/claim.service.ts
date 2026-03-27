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

    async findAll(userId: string, page = 1, limit = 20, search?: string) {
        const where: any = {
            userId,
            ...(search && {
                customer: { name: { contains: search, mode: 'insensitive' } },
            }),
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

}

export const claimService = new ClaimService();
