import prisma from '../../utils/prisma';

interface CreateDealerInput {
    name: string;
    phone?: string;
    address?: string;
}

export class DealerService {
    async create(userId: string, role: string, data: CreateDealerInput) {
        return prisma.dealer.create({
            data: {
                ...data,
                userId,
                createdBy: role,
                updatedBy: role,
            },
        });
    }

    async findAll(userId: string, page = 1, limit = 20, search?: string) {
        const where: any = {
            userId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [data, total] = await Promise.all([
            prisma.dealer.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { policies: true }
                    }
                }
            }),
            prisma.dealer.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const dealer = await prisma.dealer.findFirst({
            where: { id, userId, deletedAt: null },
            include: { policies: true },
        });

        if (!dealer) throw Object.assign(new Error('Dealer not found'), { statusCode: 404 });
        return dealer;
    }

    async update(userId: string, role: string, id: string, data: Partial<CreateDealerInput>) {
        await this.findById(userId, id); // Ensure it exists and belongs to user
        
        return prisma.dealer.update({
            where: { id },
            data: {
                ...data,
                updatedBy: role,
            },
        });
    }

    async delete(userId: string, id: string) {
        const dealer = await this.findById(userId, id);

        // Check for linked policies
        const linkedPoliciesCount = await prisma.policy.count({
            where: { dealerId: id, deletedAt: null },
        });

        if (linkedPoliciesCount > 0) {
            throw Object.assign(new Error('Cannot delete dealer with linked policies'), { statusCode: 400 });
        }

        // Hard delete as requested
        return prisma.dealer.delete({
            where: { id },
        });
    }
}

export const dealerService = new DealerService();
