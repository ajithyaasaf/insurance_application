import prisma from '../../utils/prisma';
import { buildStatusFilter, getStartOfTodayIST } from '../../utils/date';

export class DashboardService {
    async getSummary(userId: string) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const [
            expiringPolicies,
            expiringPoliciesCount,
            todayFollowUps,
            todayFollowUpsCount,
            pendingPayments,
            pendingPaymentsCount,
            overduePayments,
            overduePaymentsCount,
            totalCustomers,
            totalActivePolicies,
            totalLeads,
            recentClaims,
            companyGrouping
        ] = await Promise.all([
            // Policies expiring in next 30 days
            prisma.policy.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    ...buildStatusFilter('active'),
                    expiryDate: { gte: now, lte: thirtyDaysFromNow },
                } as any,
                include: { customer: true, company: true },
                orderBy: { expiryDate: 'asc' },
                take: 10,
            }),
            prisma.policy.count({
                where: {
                    userId,
                    deletedAt: null,
                    ...buildStatusFilter('active'),
                    expiryDate: { gte: now, lte: thirtyDaysFromNow },
                } as any,
            }),

            // Today's follow-ups
            prisma.followUp.findMany({
                where: {
                    userId,
                    status: 'pending',
                    nextFollowUpDate: { gte: todayStart, lt: todayEnd },
                },
                include: { customer: true, policy: true },
                orderBy: { nextFollowUpDate: 'asc' },
                take: 10,
            }),
            prisma.followUp.count({
                where: {
                    userId,
                    status: 'pending',
                    nextFollowUpDate: { gte: todayStart, lt: todayEnd },
                },
            }),

            // Pending payments
            prisma.payment.findMany({
                where: { userId, status: 'pending' },
                include: { customer: true, policy: true },
                orderBy: { dueDate: 'asc' },
                take: 10,
            }),
            prisma.payment.count({ where: { userId, status: 'pending' } }),

            // Overdue payments
            prisma.payment.findMany({
                where: { 
                    userId, 
                    status: { in: ['pending', 'partial'] },
                    dueDate: { lt: getStartOfTodayIST() }
                },
                include: { customer: true, policy: true },
                orderBy: { dueDate: 'asc' },
                take: 10,
            }),
            prisma.payment.count({ 
                where: { 
                    userId, 
                    status: { in: ['pending', 'partial'] },
                    dueDate: { lt: getStartOfTodayIST() }
                } 
            }),

            // Counts
            prisma.customer.count({ where: { userId, deletedAt: null } }),
            prisma.policy.count({ where: { userId, deletedAt: null, ...buildStatusFilter('active') } as any }),
            prisma.lead.count({ where: { userId, deletedAt: null } }),

            // Recent claims
            prisma.claim.findMany({
                where: { userId },
                include: { customer: true, policy: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),

            // Company stats (grouped by company)
            prisma.policy.groupBy({
                by: ['companyId'],
                where: { userId, deletedAt: null, ...buildStatusFilter('active') } as any,
                _count: { _all: true },
                _sum: { premiumAmount: true },
            }),
        ]);

        // Fetch company names for the stats
        const companyIds = companyGrouping.map((s: any) => s.companyId);
        const companies = await prisma.company.findMany({
            where: { id: { in: companyIds } },
            select: { id: true, name: true }
        });

        const companyStats = companyGrouping.map((s: any) => {
            const company = companies.find((c) => c.id === s.companyId);
            return {
                companyId: s.companyId,
                companyName: company?.name || 'Unknown',
                count: s._count._all,
                totalPremium: s._sum.premiumAmount || 0,
            };
        });

        return {
            stats: {
                totalCustomers,
                totalActivePolicies,
                totalLeads,
                expiringPoliciesCount,
                todayFollowUpsCount,
                pendingPaymentsCount,
                overduePaymentsCount,
            },
            expiringPolicies,
            todayFollowUps,
            pendingPayments,
            overduePayments,
            recentClaims,
            companyStats,
        };
    }
}

export const dashboardService = new DashboardService();
