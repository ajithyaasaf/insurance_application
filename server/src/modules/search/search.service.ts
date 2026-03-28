import { Prisma } from '@prisma/client';
import prisma from '../../utils/prisma';

export class SearchService {
    async globalSearch(userId: string, query: string) {
        if (!query || query.length < 2) {
            return { customers: [], leads: [], policies: [] };
        }

        const [customers, leads, policies] = await Promise.all([
            prisma.customer.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { email: { contains: query, mode: 'insensitive' } },
                        { phone: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
            }),
            prisma.lead.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    OR: [
                        { name: { contains: query, mode: 'insensitive' } },
                        { phone: { contains: query, mode: 'insensitive' } },
                        { interestedProduct: { contains: query, mode: 'insensitive' } },
                    ],
                },
                take: 5,
            }),
            prisma.policy.findMany({
                where: {
                    userId,
                    OR: [
                        { policyNumber: { contains: query, mode: 'insensitive' } },
                        { vehicleNumber: { contains: query, mode: 'insensitive' } },
                        { productName: { contains: query, mode: 'insensitive' } },
                        { make: { contains: query, mode: 'insensitive' } },
                        { model: { contains: query, mode: 'insensitive' } },
                    ],
                },
                include: { customer: true, company: true },
                take: 5,
            }),
        ]);

        return { customers, leads, policies };
    }
}

export const searchService = new SearchService();
