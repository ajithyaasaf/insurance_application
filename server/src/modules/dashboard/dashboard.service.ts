import prisma from '../../utils/prisma';
import { buildStatusFilter, getStartOfTodayIST } from '../../utils/date';

export class DashboardService {
    async getSummary(userId: string) {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

        const results = await Promise.all([
            // 0: Policies expiring in next 30 days
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
            // 1: Count of expiring policies
            prisma.policy.count({
                where: {
                    userId,
                    deletedAt: null,
                    ...buildStatusFilter('active'),
                    expiryDate: { gte: now, lte: thirtyDaysFromNow },
                } as any,
            }),

            // 2: Today's follow-ups
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
            // 3: Count of follow-ups
            prisma.followUp.count({
                where: {
                    userId,
                    status: 'pending',
                    nextFollowUpDate: { gte: todayStart, lt: todayEnd },
                },
            }),

            // 4: Pending payments
            prisma.payment.findMany({
                where: { userId, status: 'pending' },
                include: { customer: true, policy: true },
                orderBy: { dueDate: 'asc' },
                take: 10,
            }),
            // 5: Count pending payments
            prisma.payment.count({ where: { userId, status: 'pending' } }),

            // 6: Overdue payments
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
            // 7: Count overdue payments
            prisma.payment.count({ 
                where: { 
                    userId, 
                    status: { in: ['pending', 'partial'] },
                    dueDate: { lt: getStartOfTodayIST() }
                } 
            }),

            // 8: Total Customers
            prisma.customer.count({ where: { userId, deletedAt: null } }),
            // 9: Total Active Policies
            prisma.policy.count({ where: { userId, deletedAt: null, ...buildStatusFilter('active') } as any }),
            // 10: Total Leads
            prisma.lead.count({ where: { userId, deletedAt: null, status: { not: 'converted' } } }),

            // 11: Recent claims
            prisma.claim.findMany({
                where: { userId },
                include: { customer: true, policy: true },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),

            // 12: Company stats (grouped by company)
            prisma.policy.groupBy({
                by: ['companyId'],
                where: { userId, deletedAt: null, ...buildStatusFilter('active') } as any,
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            }),

            // 13: Today's lead follow-ups
            prisma.lead.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    nextFollowUpDate: { gte: todayStart, lt: todayEnd },
                },
                orderBy: { nextFollowUpDate: 'asc' },
                take: 10,
            }),
            // 14: Count lead follow-ups
            prisma.lead.count({
                where: {
                    userId,
                    deletedAt: null,
                    nextFollowUpDate: { gte: todayStart, lt: todayEnd },
                },
            }),

            // 15: Today's birthdays candidates
            prisma.customer.findMany({
                where: {
                    userId,
                    deletedAt: null,
                    dob: { not: null },
                },
                select: { id: true, name: true, phone: true, dob: true },
            }),
        ]);

        const expiringPolicies = results[0] as any[];
        const expiringPoliciesCount = results[1] as number;
        const todayFollowUps = results[2] as any[];
        const todayFollowUpsCount = results[3] as number;
        const pendingPayments = results[4] as any[];
        const pendingPaymentsCount = results[5] as number;
        const overduePayments = results[6] as any[];
        const overduePaymentsCount = results[7] as number;
        const totalCustomers = results[8] as number;
        const totalActivePolicies = results[9] as number;
        const totalLeads = results[10] as number;
        const recentClaims = results[11] as any[];
        const companyGrouping = results[12] as any[];
        const todayLeadFollowUps = results[13] as any[];
        const todayLeadFollowUpsCount = results[14] as number;
        const allBirthdayCandidates = results[15] as any[];

        // Filter birthdays in JS for compatibility across DB engines (sqlite/postgres)
        const todayMonth = now.getMonth();
        const todayDay = now.getDate();
        const todayBirthdays = allBirthdayCandidates.filter(c => {
            if (!c.dob) return false;
            const d = new Date(c.dob);
            return d.getMonth() === todayMonth && d.getDate() === todayDay;
        });

        // Merge and process follow-ups
        const combinedFollowUps = [
            ...todayFollowUps.map(f => ({ ...f, type: 'followup' })),
            ...todayLeadFollowUps.map(l => ({ ...l, type: 'lead', customer: { name: l.name } }))
        ].sort((a: any, b: any) => 
            new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime()
        ).slice(0, 10);

        const combinedFollowUpsCount = todayFollowUpsCount + todayLeadFollowUpsCount;

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
                totalPremium: s._sum.totalPremium || s._sum.premiumAmount || 0,
            };
        });

        return {
            stats: {
                totalCustomers,
                totalActivePolicies,
                totalLeads,
                expiringPoliciesCount,
                todayFollowUpsCount: combinedFollowUpsCount,
                pendingPaymentsCount,
                overduePaymentsCount,
                todayBirthdaysCount: todayBirthdays.length,
            },
            expiringPolicies,
            todayFollowUps: combinedFollowUps,
            pendingPayments,
            overduePayments,
            recentClaims,
            companyStats,
            todayBirthdays,
        };
    }
}

export const dashboardService = new DashboardService();
