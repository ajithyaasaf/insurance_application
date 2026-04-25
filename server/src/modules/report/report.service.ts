import prisma from '../../utils/prisma';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import { buildStatusFilter, mapPolicyStatus, getStartOfTodayIST, mapPaymentStatus } from '../../utils/date';
import type { ReportSource, ReportGroupBy } from './report.schema';

// ─── Types ───────────────────────────────────────────────

interface ReportFilters {
    companyId?: string;
    dealerId?: string;
    customerId?: string;
    policyType?: string;
    vehicleClass?: string;
    status?: string;
    policyOrigin?: string;
    dateFrom?: string;
    dateTo?: string;
}

interface GenerateParams {
    source: ReportSource;
    filters?: ReportFilters;
    groupBy?: ReportGroupBy;
    page: number;
    limit: number;
}

interface ExportParams {
    source: ReportSource;
    filters?: ReportFilters;
    groupBy?: ReportGroupBy;
    format: 'xlsx' | 'pdf';
    columns?: string[];
    title?: string;
}

// ─── Column definitions per source ───────────────────────

const SOURCE_COLUMNS: Record<string, { key: string; label: string }[]> = {
    policies: [
        { key: 'policyNumber', label: 'Policy #' },
        { key: 'customerName', label: 'Customer' },
        { key: 'customerPhone', label: 'Phone' },
        { key: 'companyName', label: 'Company' },
        { key: 'policyType', label: 'Type' },
        { key: 'vehicleNumber', label: 'Vehicle #' },
        { key: 'premiumAmount', label: 'Net Premium (₹)' },
        { key: 'tax', label: 'Tax (₹)' },
        { key: 'totalPremium', label: 'Total Premium (₹)' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'expiryDate', label: 'Expiry Date' },
        { key: 'status', label: 'Status' },
        { key: 'policyOrigin', label: 'Origin' },
    ],
    payments: [
        { key: 'customerName', label: 'Customer' },
        { key: 'policyNumber', label: 'Policy #' },
        { key: 'companyName', label: 'Company' },
        { key: 'amount', label: 'Amount (₹)' },
        { key: 'paidAmount', label: 'Paid (₹)' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'paidDate', label: 'Paid Date' },
        { key: 'status', label: 'Status' },
    ],
    claims: [
        { key: 'claimNumber', label: 'Claim #' },
        { key: 'customerName', label: 'Customer' },
        { key: 'policyNumber', label: 'Policy #' },
        { key: 'companyName', label: 'Company' },
        { key: 'claimAmount', label: 'Amount (₹)' },
        { key: 'claimDate', label: 'Claim Date' },
        { key: 'status', label: 'Status' },
        { key: 'reason', label: 'Reason' },
    ],
    customers: [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Address' },
        { key: 'totalPolicies', label: 'Total Policies' },
        { key: 'totalPremium', label: 'Total Premium (₹)' },
        { key: 'createdAt', label: 'Added On' },
    ],
    followups: [
        { key: 'customerName', label: 'Customer' },
        { key: 'customerPhone', label: 'Phone' },
        { key: 'policyNumber', label: 'Policy #' },
        { key: 'nextFollowUpDate', label: 'Follow-up Date' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' },
    ],
};

// ─── Helper: build Prisma where clause ───────────────────

function buildPolicyWhere(userId: string, filters?: ReportFilters) {
    const where: any = { userId, deletedAt: null };
    if (filters?.companyId) where.companyId = filters.companyId;
    if (filters?.dealerId) where.dealerId = filters.dealerId;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.policyType) where.policyType = filters.policyType;
    if (filters?.vehicleClass) where.vehicleClass = filters.vehicleClass;
    if (filters?.policyOrigin) where.policyOrigin = filters.policyOrigin;
    if (filters?.status) {
        Object.assign(where, buildStatusFilter(filters.status));
    }
    if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters?.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters?.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }
    return where;
}

function buildPaymentWhere(userId: string, filters?: ReportFilters) {
    const where: any = { userId };
    const todayIST = getStartOfTodayIST();

    if (filters?.status) {
        if (filters.status === 'overdue') {
            where.status = { in: ['pending', 'partial'] };
            where.dueDate = { lt: todayIST };
        } else {
            where.status = filters.status;
        }
    }

    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters?.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters?.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }
    // Join-level filters (company, dealer) — we filter via the policy relation
    if (filters?.companyId || filters?.dealerId || filters?.policyType) {
        where.policy = { deletedAt: null };
        if (filters?.companyId) where.policy.companyId = filters.companyId;
        if (filters?.dealerId) where.policy.dealerId = filters.dealerId;
        if (filters?.policyType) where.policy.policyType = filters.policyType;
    }
    return where;
}

function buildClaimWhere(userId: string, filters?: ReportFilters) {
    const where: any = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
        where.claimDate = {};
        if (filters?.dateFrom) where.claimDate.gte = new Date(filters.dateFrom);
        if (filters?.dateTo) where.claimDate.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }
    if (filters?.companyId || filters?.policyType) {
        where.policy = { deletedAt: null };
        if (filters?.companyId) where.policy.companyId = filters.companyId;
        if (filters?.policyType) where.policy.policyType = filters.policyType;
    }
    return where;
}

function buildCustomerWhere(userId: string, filters?: ReportFilters) {
    const where: any = { userId, deletedAt: null };
    if (filters?.customerId) where.id = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
        where.createdAt = {};
        if (filters?.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
        if (filters?.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }
    return where;
}

function buildFollowUpWhere(userId: string, filters?: ReportFilters) {
    const where: any = { userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.customerId) where.customerId = filters.customerId;
    if (filters?.dateFrom || filters?.dateTo) {
        where.nextFollowUpDate = {};
        if (filters?.dateFrom) where.nextFollowUpDate.gte = new Date(filters.dateFrom);
        if (filters?.dateTo) where.nextFollowUpDate.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
    }
    if (filters?.companyId || filters?.policyType) {
        where.policy = { deletedAt: null };
        if (filters?.companyId) where.policy.companyId = filters.companyId;
        if (filters?.policyType) where.policy.policyType = filters.policyType;
    }
    return where;
}

// ─── Helper: format date for display ─────────────────────

function fmtDate(d: Date | null | undefined): string {
    if (!d) return '';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d));
}

// ─── Service Class ───────────────────────────────────────

export class ReportService {

    // ── Flat data queries (no grouping) ──────────────────

    private async queryPolicies(userId: string, filters?: ReportFilters, page = 1, limit = 50) {
        const where = buildPolicyWhere(userId, filters);
        const [rows, total] = await Promise.all([
            prisma.policy.findMany({
                where,
                include: { customer: true, company: true, dealer: true },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.policy.count({ where }),
        ]);

        const data = rows.map(mapPolicyStatus).map((r: any) => ({
            policyNumber: r.policyNumber || '—',
            customerName: r.customer?.name || '—',
            customerPhone: r.customer?.phone || '—',
            companyName: r.company?.name || '—',
            dealerName: r.dealer?.name || '—',
            policyType: r.policyType,
            productName: r.policyType === 'motor' ? `${r.make || ''} ${r.model || ''}`.trim() || 'Motor' : r.productName || '—',
            vehicleNumber: r.vehicleNumber || '—',
            vehicleClass: r.vehicleClass || '—',
            premiumAmount: r.premiumAmount,
            tax: r.tax || 0,
            totalPremium: r.totalPremium || r.premiumAmount,
            sumInsured: r.policyType === 'motor' ? (r.idv || 0) : (r.sumInsured || 0),
            startDate: fmtDate(r.startDate),
            expiryDate: fmtDate(r.expiryDate),
            status: r.status,
            policyOrigin: r.policyOrigin === 'external_renewal' ? 'External Renewal'
                : r.policyOrigin === 'in_system_renewal' ? 'In-System Renewal'
                : 'Fresh',
        }));

        return { data, total, columns: SOURCE_COLUMNS.policies };
    }

    private async queryPayments(userId: string, filters?: ReportFilters, page = 1, limit = 50) {
        const where = buildPaymentWhere(userId, filters);
        const [rows, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                include: { customer: true, policy: { include: { company: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.payment.count({ where }),
        ]);

        const data = rows.map((r: any) => ({
            customerName: r.customer?.name || '—',
            policyNumber: r.policy?.policyNumber || '—',
            companyName: r.policy?.company?.name || '—',
            amount: r.amount,
            paidAmount: r.paidAmount ?? 0,
            dueDate: fmtDate(r.dueDate),
            paidDate: fmtDate(r.paidDate),
            status: r.status,
        }));

        return { data, total, columns: SOURCE_COLUMNS.payments };
    }

    private async queryClaims(userId: string, filters?: ReportFilters, page = 1, limit = 50) {
        const where = buildClaimWhere(userId, filters);
        const [rows, total] = await Promise.all([
            prisma.claim.findMany({
                where,
                include: { customer: true, policy: { include: { company: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.claim.count({ where }),
        ]);

        const data = rows.map((r: any) => ({
            claimNumber: r.claimNumber || '—',
            customerName: r.customer?.name || '—',
            policyNumber: r.policy?.policyNumber || '—',
            companyName: r.policy?.company?.name || '—',
            claimAmount: r.claimAmount,
            claimDate: fmtDate(r.claimDate),
            status: r.status,
            reason: r.reason || '—',
        }));

        return { data, total, columns: SOURCE_COLUMNS.claims };
    }

    private async queryCustomers(userId: string, filters?: ReportFilters, page = 1, limit = 50) {
        const where = buildCustomerWhere(userId, filters);
        const [rows, total] = await Promise.all([
            prisma.customer.findMany({
                where,
                include: {
                    policies: {
                        where: { deletedAt: null },
                        select: { premiumAmount: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.customer.count({ where }),
        ]);

        const data = rows.map((r: any) => ({
            name: r.name,
            phone: r.phone || '—',
            email: r.email || '—',
            address: r.address || '—',
            totalPolicies: r.policies?.length || 0,
            totalPremium: r.policies?.reduce((s: number, p: any) => s + (p.totalPremium || p.premiumAmount || 0), 0) || 0,
            createdAt: fmtDate(r.createdAt),
        }));

        return { data, total, columns: SOURCE_COLUMNS.customers };
    }

    private async queryFollowUps(userId: string, filters?: ReportFilters, page = 1, limit = 50) {
        const where = buildFollowUpWhere(userId, filters);
        const [rows, total] = await Promise.all([
            prisma.followUp.findMany({
                where,
                include: { customer: true, policy: true },
                orderBy: { nextFollowUpDate: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.followUp.count({ where }),
        ]);

        const data = rows.map((r: any) => ({
            customerName: r.customer?.name || '—',
            customerPhone: r.customer?.phone || '—',
            policyNumber: r.policy?.policyNumber || '—',
            nextFollowUpDate: fmtDate(r.nextFollowUpDate),
            status: r.status,
            notes: r.notes || '—',
        }));

        return { data, total, columns: SOURCE_COLUMNS.followups };
    }

    // ── Grouped aggregation queries ──────────────────────

    private async queryGrouped(userId: string, source: ReportSource, filters: ReportFilters | undefined, groupBy: ReportGroupBy) {
        // We only support grouping on policies source for now (most common use case)
        // Other sources can be added the same way
        if (source === 'policies') {
            return this.groupPolicies(userId, filters, groupBy);
        }
        if (source === 'payments') {
            return this.groupPayments(userId, filters, groupBy);
        }
        // For unsupported combos, fall back to flat data
        return null;
    }

    private async groupPolicies(userId: string, filters: ReportFilters | undefined, groupBy: ReportGroupBy) {
        const where = buildPolicyWhere(userId, filters);

        if (groupBy === 'company') {
            const groups = await prisma.policy.groupBy({
                by: ['companyId'],
                where,
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            const companyIds = groups.map((g: any) => g.companyId);
            const companies = await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } });
            return {
                grouped: true,
                groupLabel: 'Company',
                columns: [
                    { key: 'name', label: 'Company' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: companies.find((c) => c.id === g.companyId)?.name || 'Unknown',
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.premiumSum - a.premiumSum),
                total: groups.length,
            };
        }

        if (groupBy === 'dealer') {
            const groups = await prisma.policy.groupBy({
                by: ['dealerId'],
                where: { ...where, dealerId: { not: null } },
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            const dealerIds = groups.map((g: any) => g.dealerId).filter(Boolean) as string[];
            const dealers = await prisma.dealer.findMany({ where: { id: { in: dealerIds } }, select: { id: true, name: true } });
            return {
                grouped: true,
                groupLabel: 'Dealer',
                columns: [
                    { key: 'name', label: 'Dealer' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: dealers.find((d) => d.id === g.dealerId)?.name || 'Unknown',
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.premiumSum - a.premiumSum),
                total: groups.length,
            };
        }

        if (groupBy === 'policyType') {
            const groups = await prisma.policy.groupBy({
                by: ['policyType'],
                where,
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            return {
                grouped: true,
                groupLabel: 'Policy Type',
                columns: [
                    { key: 'name', label: 'Policy Type' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: g.policyType,
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.premiumSum - a.premiumSum),
                total: groups.length,
            };
        }

        if (groupBy === 'vehicleClass') {
            const groups = await prisma.policy.groupBy({
                by: ['vehicleClass'],
                where: { ...where, vehicleClass: { not: null } },
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            return {
                grouped: true,
                groupLabel: 'Vehicle Class',
                columns: [
                    { key: 'name', label: 'Vehicle Class' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: g.vehicleClass || 'N/A',
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.premiumSum - a.premiumSum),
                total: groups.length,
            };
        }

        if (groupBy === 'status') {
            const groups = await prisma.policy.groupBy({
                by: ['status'],
                where,
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            return {
                grouped: true,
                groupLabel: 'Status',
                columns: [
                    { key: 'name', label: 'Status' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: g.status,
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.count - a.count),
                total: groups.length,
            };
        }

        if (groupBy === 'policyOrigin') {
            const groups = await prisma.policy.groupBy({
                by: ['policyOrigin'],
                where,
                _count: { _all: true },
                _sum: { premiumAmount: true, totalPremium: true },
            });
            const originLabels: Record<string, string> = {
                fresh: 'Fresh',
                external_renewal: 'External Renewal',
                in_system_renewal: 'In-System Renewal',
            };
            return {
                grouped: true,
                groupLabel: 'Policy Origin',
                columns: [
                    { key: 'name', label: 'Origin' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: originLabels[g.policyOrigin] || g.policyOrigin,
                    count: g._count._all,
                    premiumSum: g._sum.premiumAmount || 0,
                    totalPremiumSum: g._sum.totalPremium || 0,
                })).sort((a: any, b: any) => b.count - a.count),
                total: groups.length,
            };
        }

        if (groupBy === 'month') {
            const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
            const dateTo = filters?.dateTo ? new Date(filters.dateTo + 'T23:59:59.999Z') : undefined;

            // Use Raw SQL for efficient grouping in the database
            const results: any[] = await prisma.$queryRaw`
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') AS name,
                    COUNT(*)::INT AS count,
                    SUM("premiumAmount")::FLOAT AS "premiumSum",
                    SUM(COALESCE("totalPremium", "premiumAmount"))::FLOAT AS "totalPremiumSum"
                FROM "Policy"
                WHERE 
                    "userId" = ${userId}
                    AND "deletedAt" IS NULL
                    ${dateFrom ? Prisma.sql`AND "createdAt" >= ${dateFrom}` : Prisma.empty}
                    ${dateTo ? Prisma.sql`AND "createdAt" <= ${dateTo}` : Prisma.empty}
                    ${filters?.companyId ? Prisma.sql`AND "companyId" = ${filters.companyId}` : Prisma.empty}
                    ${filters?.dealerId ? Prisma.sql`AND "dealerId" = ${filters.dealerId}` : Prisma.empty}
                    ${filters?.policyType ? Prisma.sql`AND "policyType"::text = ${filters.policyType}` : Prisma.empty}
                GROUP BY name
                ORDER BY name DESC
            `;

            return {
                grouped: true,
                groupLabel: 'Month',
                columns: [
                    { key: 'name', label: 'Month' },
                    { key: 'count', label: 'Total Policies' },
                    { key: 'premiumSum', label: 'Premium (₹)' },
                    { key: 'totalPremiumSum', label: 'Total Premium (₹)' },
                ],
                data: results,
                total: results.length,
            };
        }

        return null;
    }

    private async groupPayments(userId: string, filters: ReportFilters | undefined, groupBy: ReportGroupBy) {
        const where = buildPaymentWhere(userId, filters);

        if (groupBy === 'status') {
            const groups = await prisma.payment.groupBy({
                by: ['status'],
                where,
                _count: { _all: true },
                _sum: { amount: true, paidAmount: true },
            });
            return {
                grouped: true,
                groupLabel: 'Payment Status',
                columns: [
                    { key: 'name', label: 'Status' },
                    { key: 'count', label: 'Total Payments' },
                    { key: 'amountSum', label: 'Total Amount (₹)' },
                    { key: 'paidSum', label: 'Paid Amount (₹)' },
                ],
                data: groups.map((g: any) => ({
                    name: g.status,
                    count: g._count._all,
                    amountSum: g._sum.amount || 0,
                    paidSum: g._sum.paidAmount || 0,
                })),
                total: groups.length,
            };
        }

        if (groupBy === 'month') {
            const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
            const dateTo = filters?.dateTo ? new Date(filters.dateTo + 'T23:59:59.999Z') : undefined;

            const results: any[] = await prisma.$queryRaw`
                SELECT 
                    TO_CHAR(DATE_TRUNC('month', p."createdAt"), 'YYYY-MM') AS name,
                    COUNT(*)::INT AS count,
                    SUM(p."amount")::FLOAT AS "amountSum",
                    SUM(COALESCE(p."paidAmount", 0))::FLOAT AS "paidSum"
                FROM "Payment" p
                ${(filters?.companyId || filters?.dealerId || filters?.policyType) ? Prisma.sql`JOIN "Policy" pol ON p."policyId" = pol."id"` : Prisma.empty}
                WHERE 
                    p."userId" = ${userId}
                    ${dateFrom ? Prisma.sql`AND p."createdAt" >= ${dateFrom}` : Prisma.empty}
                    ${dateTo ? Prisma.sql`AND p."createdAt" <= ${dateTo}` : Prisma.empty}
                    ${filters?.customerId ? Prisma.sql`AND p."customerId" = ${filters.customerId}` : Prisma.empty}
                    ${filters?.companyId ? Prisma.sql`AND pol."companyId" = ${filters.companyId}` : Prisma.empty}
                    ${filters?.dealerId ? Prisma.sql`AND pol."dealerId" = ${filters.dealerId}` : Prisma.empty}
                    ${filters?.policyType ? Prisma.sql`AND pol."policyType"::text = ${filters.policyType}` : Prisma.empty}
                GROUP BY name
                ORDER BY name DESC
            `;

            const columns = [
                { key: 'name', label: 'Month' },
                { key: 'count', label: 'Total Payments' },
                { key: 'amountSum', label: 'Total Amount (₹)' },
                { key: 'paidSum', label: 'Paid Amount (₹)' },
            ];
            return { grouped: true, groupLabel: 'Month', columns, data: results, total: results.length };
        }

        return null;
    }

    // ── Public API ───────────────────────────────────────

    async generateReport(userId: string, params: GenerateParams) {
        const { source, filters, groupBy, page, limit } = params;

        // If groupBy is requested, use aggregation
        if (groupBy) {
            const grouped = await this.queryGrouped(userId, source, filters, groupBy);
            if (grouped) return grouped;
        }

        // Flat data query
        const queryMap: Record<string, Function> = {
            policies: () => this.queryPolicies(userId, filters, page, limit),
            payments: () => this.queryPayments(userId, filters, page, limit),
            claims: () => this.queryClaims(userId, filters, page, limit),
            customers: () => this.queryCustomers(userId, filters, page, limit),
            followups: () => this.queryFollowUps(userId, filters, page, limit),
        };

        const result = await queryMap[source]();
        return {
            grouped: false,
            ...result,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
        };
    }

    // ── Dashboard analytics (pre-computed) ───────────────

    async getDashboardReport(userId: string, filters?: { dateFrom?: string; dateTo?: string }) {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastYearStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        // When the user provides date filters, use those for KPIs; otherwise default to current month
        const periodFilters: ReportFilters | undefined = filters?.dateFrom || filters?.dateTo
            ? filters
            : undefined;

        // For KPI cards - use the filtered period or fall back to current month
        const kpiWhere: any = { userId, deletedAt: null };
        if (periodFilters?.dateFrom || periodFilters?.dateTo) {
            kpiWhere.createdAt = {};
            if (periodFilters.dateFrom) kpiWhere.createdAt.gte = new Date(periodFilters.dateFrom);
            if (periodFilters.dateTo) kpiWhere.createdAt.lte = new Date(periodFilters.dateTo);
        } else {
            kpiWhere.createdAt = { gte: thisMonthStart };
        }

        // For monthlyTrend - use filtered end date or now, look back 12 months from that point
        const trendEnd = filters?.dateTo ? new Date(filters.dateTo) : now;
        const trendStart = filters?.dateFrom
            ? new Date(filters.dateFrom)
            : new Date(trendEnd.getFullYear() - 1, trendEnd.getMonth(), 1);

        const [
            companyPerformance,
            policyTypeBreakdown,
            dealerPerformance,
            monthlyTrend,
            paymentSummary,
            renewalStats,
            periodCount,
            periodPremium,
        ] = await Promise.all([
            // Company-wise performance (filtered)
            this.groupPolicies(userId, periodFilters, 'company'),

            // Policy type breakdown (filtered)
            this.groupPolicies(userId, periodFilters, 'policyType'),

            // Dealer performance (filtered)
            this.groupPolicies(userId, periodFilters, 'dealer'),

            // Monthly premium trend
            this.groupPolicies(userId, {
                dateFrom: trendStart.toISOString().split('T')[0],
                dateTo: trendEnd.toISOString().split('T')[0],
            }, 'month'),

            // Payment collection summary (filtered)
            this.groupPayments(userId, periodFilters, 'status'),

            // Renewal stats (all-time — not date-sensitive as a concept)
            prisma.$transaction([
                prisma.policy.count({
                    where: { userId, deletedAt: null, parentPolicyId: { not: null } },
                }),
                prisma.policy.count({
                    where: { userId, deletedAt: null, status: 'expired' },
                }),
            ]),

            // Period policies count
            prisma.policy.count({ where: kpiWhere }),

            // Period premium total
            prisma.policy.aggregate({
                where: kpiWhere,
                _sum: { premiumAmount: true, totalPremium: true },
            }),
        ]);

        const [renewedCount, expiredCount] = renewalStats;
        const totalRev = (periodPremium as any)?._sum?.totalPremium || (periodPremium as any)?._sum?.premiumAmount || 0;

        return {
            companyPerformance,
            policyTypeBreakdown,
            dealerPerformance,
            monthlyTrend,
            paymentSummary,
            renewalStats: {
                renewed: renewedCount,
                expired: expiredCount,
                successRate: (renewedCount + expiredCount) > 0
                    ? Math.round((renewedCount / (renewedCount + expiredCount)) * 100)
                    : 0,
            },
            // Key label for the UI — tells the frontend if it's filtered or default
            periodLabel: (filters?.dateFrom || filters?.dateTo) ? 'Selected Period' : 'This Month',
            thisMonth: {
                policiesAdded: periodCount,
                totalPremium: totalRev,
            },
        };
    }

    // ── Export to XLSX ────────────────────────────────────

    async exportXlsx(data: any[], columns: { key: string; label: string }[], title?: string): Promise<Buffer> {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'InsureCRM Pro';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(title || 'Report');

        // Header row
        sheet.columns = columns.map((col) => ({
            header: col.label,
            key: col.key,
            width: Math.max(col.label.length + 5, 15),
        }));

        // Style header
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4338CA' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 28;

        // Data rows
        for (const row of data) {
            sheet.addRow(row);
        }

        // Style data rows with alternating colors
        for (let i = 2; i <= sheet.rowCount; i++) {
            const row = sheet.getRow(i);
            row.alignment = { vertical: 'middle' };
            if (i % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F3FF' },
                };
            }
        }

        // Auto-filter
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length },
        };

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    // ── Export to PDF ─────────────────────────────────────

    async exportPdf(data: any[], columns: { key: string; label: string }[], title?: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Title
            doc.fontSize(18).font('Helvetica-Bold')
                .fillColor('#1e1b4b')
                .text(title || 'Report', { align: 'center' });
            doc.moveDown(0.3);
            doc.fontSize(9).font('Helvetica')
                .fillColor('#6b7280')
                .text(`Generated on ${new Date().toLocaleDateString('en-IN')} | InsureCRM Pro`, { align: 'center' });
            doc.moveDown(1);

            // Table
            const colWidth = Math.min(
                (doc.page.width - 80) / Math.min(columns.length, 8),
                120
            );
            const visibleCols = columns.slice(0, 8); // Max 8 columns in PDF
            const startX = 40;

            // Header row
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
            let x = startX;
            for (const col of visibleCols) {
                doc.rect(x, doc.y, colWidth, 22).fill('#4338CA');
                doc.fillColor('#FFFFFF')
                    .text(col.label, x + 4, doc.y + 6, { width: colWidth - 8, align: 'left' });
                x += colWidth;
            }
            // Fix: reset Y after header
            doc.y += 22;
            doc.moveDown(0.2);

            // Data rows
            doc.font('Helvetica').fontSize(7).fillColor('#1f2937');
            let rowIdx = 0;
            for (const row of data) {
                if (doc.y > doc.page.height - 60) {
                    doc.addPage();
                    doc.y = 40;
                }

                x = startX;
                const bgColor = rowIdx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
                for (const col of visibleCols) {
                    const val = String(row[col.key] ?? '—');
                    doc.rect(x, doc.y, colWidth, 18).fill(bgColor);
                    doc.fillColor('#1f2937')
                        .text(val, x + 4, doc.y + 4, { width: colWidth - 8, align: 'left' });
                    x += colWidth;
                }
                doc.y += 18;
                rowIdx++;
            }

            // Footer
            doc.moveDown(1);
            doc.fontSize(8).fillColor('#9ca3af')
                .text(`Total Records: ${data.length}`, startX, doc.y, { align: 'left' });

            doc.end();
        });
    }
}

export const reportService = new ReportService();
