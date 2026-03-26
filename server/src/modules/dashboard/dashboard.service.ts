import prisma from '../../utils/prisma';

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
        ] = await Promise.all([
            // Policies expiring in next 30 days
            prisma.policy.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    status: 'active',
                    expiryDate: { gte: now, lte: thirtyDaysFromNow },
                },
                include: { customer: true, company: true },
                orderBy: { expiryDate: 'asc' },
                take: 10,
            }),
            prisma.policy.count({
                where: {
                    userId,
                    deletedAt: null,
                    status: 'active',
                    expiryDate: { gte: now, lte: thirtyDaysFromNow },
                },
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
                where: { userId, status: 'overdue' },
                include: { customer: true, policy: true },
                orderBy: { dueDate: 'asc' },
                take: 10,
            }),
            prisma.payment.count({ where: { userId, status: 'overdue' } }),

            // Counts
            prisma.customer.count({ where: { userId, deletedAt: null } }),
            prisma.policy.count({ where: { userId, deletedAt: null, status: 'active' } }),
            prisma.lead.count({ where: { userId, deletedAt: null } }),

            // Recent claims
            prisma.claim.findMany({
                where: { userId },
                include: { customer: true, policy: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]);

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
        };
    }
}

export const dashboardService = new DashboardService();
