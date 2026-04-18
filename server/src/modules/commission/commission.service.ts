import prisma from '../../utils/prisma';
import { CommissionPreviewInput, CommissionCreateInput, CommissionUpdateInput } from './commission.schema';

export class CommissionService {
    /**
     * Get an overview of pending (unprocessed) commissions grouped by dealer.
     * Helpful for UX so admins know who needs to be paid without guessing.
     */
    async getPending(userId: string) {
        // Find all active policies that are NOT yet tied to any commission
        const unprocessedPolicies = await prisma.policy.findMany({
            where: {
                userId,
                deletedAt: null,
                dealerId: { not: null },
                commissionPolicies: { none: {} }
            },
            select: { dealerId: true, startDate: true },
            orderBy: { startDate: 'asc' } // Earliest first
        });

        const dealerMap = new Map<string, { count: number; oldestDate: Date }>();
        for (const p of unprocessedPolicies) {
            const did = p.dealerId as string;   
            if (!dealerMap.has(did)) {
                dealerMap.set(did, { count: 0, oldestDate: p.startDate });
            }
            const stat = dealerMap.get(did)!;
            stat.count++;
        }

        // Fetch dealer names
        const dealerIds = Array.from(dealerMap.keys());
        const dealers = await prisma.dealer.findMany({
            where: { id: { in: dealerIds }, deletedAt: null },
            select: { id: true, name: true, phone: true }
        });

        return dealers.map(d => ({
            dealerId: d.id,
            dealerName: d.name,
            dealerPhone: d.phone,
            unprocessedCount: dealerMap.get(d.id)?.count || 0,
            oldestPolicyDate: dealerMap.get(d.id)?.oldestDate || new Date()
        })).sort((a, b) => b.unprocessedCount - a.unprocessedCount); // Highest pending first
    }

    /**
     * Preview: Fetch dealer's policies in date range and calculate commission WITHOUT saving.
     */
    async preview(userId: string, data: CommissionPreviewInput) {
        const { dealerId, periodStart, periodEnd, odPercentage, tpPercentage } = data;

        const parsedStartDate = new Date(periodStart);
        const parsedEndDate = new Date(periodEnd);
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        // Validate dealer ownership
        const dealer = await prisma.dealer.findFirst({
            where: { id: dealerId, userId, deletedAt: null },
        });
        if (!dealer) throw Object.assign(new Error('Dealer not found or unauthorized'), { statusCode: 404 });

        // Count how many policies in this date range are ALREADY processed
        const alreadyProcessedCount = await prisma.policy.count({
            where: {
                userId,
                dealerId,
                deletedAt: null,
                startDate: {
                    gte: parsedStartDate,
                    lte: parsedEndDate,
                },
                commissionPolicies: {
                    some: {} // Has at least one commission record mapped
                }
            }
        });

        // Fetch motor policies for this dealer within the date range
        const policies = await prisma.policy.findMany({
            where: {
                userId,
                dealerId,
                deletedAt: null,
                startDate: {
                    gte: parsedStartDate,
                    lte: parsedEndDate,
                },
                // Critical logic: Exclude policies that are already tied to an existing commission record!
                commissionPolicies: {
                    none: {}
                }
            },
            orderBy: { startDate: 'desc' },
        });

        // Calculate commission per policy
        const policyBreakdown = policies.map(p => {
            const od = p.od || 0;
            const tp = p.tp || 0;
            const odCommission = parseFloat(((od * odPercentage) / 100).toFixed(2));
            const tpCommission = parseFloat(((tp * tpPercentage) / 100).toFixed(2));
            return {
                policyId: p.id,
                vehicleNumber: p.vehicleNumber,
                make: p.make,
                model: p.model,
                vehicleClass: p.vehicleClass,
                od,
                tp,
                premiumAmount: p.premiumAmount,
                startDate: p.startDate,
                expiryDate: p.expiryDate,
                odCommission,
                tpCommission,
                totalCommission: parseFloat((odCommission + tpCommission).toFixed(2)),
            };
        });

        const totalOdCommission = parseFloat(policyBreakdown.reduce((sum, p) => sum + p.odCommission, 0).toFixed(2));
        const totalTpCommission = parseFloat(policyBreakdown.reduce((sum, p) => sum + p.tpCommission, 0).toFixed(2));
        const totalCommission = parseFloat((totalOdCommission + totalTpCommission).toFixed(2));
        const totalPremium = parseFloat(policyBreakdown.reduce((sum, p) => sum + p.premiumAmount, 0).toFixed(2));

        return {
            dealer: { id: dealer.id, name: dealer.name },
            periodStart,
            periodEnd,
            odPercentage,
            tpPercentage,
            alreadyProcessedCount,
            policies: policyBreakdown,
            summary: { totalOdCommission, totalTpCommission, totalCommission, totalPremium, policyCount: policyBreakdown.length },
        };
    }

    /**
     * Create: Calculate AND save commission to history.
     */
    async create(userId: string, data: CommissionCreateInput) {
        // First run preview to get the full calculation
        const preview = await this.preview(userId, data);

        if (preview.policies.length === 0) {
            throw Object.assign(new Error('No policies found for the selected dealer and date range'), { statusCode: 400 });
        }

        // Save in a transaction
        return prisma.$transaction(async (tx) => {
            const commission = await tx.commission.create({
                data: {
                    userId,
                    dealerId: data.dealerId,
                    periodStart: new Date(data.periodStart),
                    periodEnd: new Date(data.periodEnd),
                    odPercentage: data.odPercentage,
                    tpPercentage: data.tpPercentage,
                    totalOdCommission: preview.summary.totalOdCommission,
                    totalTpCommission: preview.summary.totalTpCommission,
                    totalCommission: preview.summary.totalCommission,
                    totalPremium: preview.summary.totalPremium,
                    notes: data.notes,
                    status: 'draft',
                },
            });

            // Save snapshot of each policy's data at this point in time
            for (const p of preview.policies) {
                await tx.commissionPolicy.create({
                    data: {
                        commissionId: commission.id,
                        policyId: p.policyId,
                        vehicleNumber: p.vehicleNumber,
                        make: p.make,
                        model: p.model,
                        vehicleClass: p.vehicleClass,
                        od: p.od,
                        tp: p.tp,
                        premiumAmount: p.premiumAmount,
                        startDate: p.startDate,
                        expiryDate: p.expiryDate,
                        odCommission: p.odCommission,
                        tpCommission: p.tpCommission,
                    },
                });
            }

            return { ...commission, policyCount: preview.policies.length };
        });
    }

    /**
     * List all commissions for the user, with filters.
     */
    async findAll(userId: string, dealerId?: string, status?: string, dateFrom?: string, dateTo?: string) {
        const where: any = { userId };
        if (dealerId) where.dealerId = dealerId;
        if (status) where.status = status;
        
        if (dateFrom || dateTo) {
            where.periodStart = {};
            if (dateFrom) where.periodStart.gte = new Date(dateFrom);
            if (dateTo) {
                const to = new Date(dateTo);
                to.setUTCHours(23, 59, 59, 999);
                where.periodStart.lte = to;
            }
        }

        return prisma.commission.findMany({
            where,
            include: {
                dealer: { select: { id: true, name: true } },
                _count: { select: { commissionPolicies: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Get a single commission with full policy breakdown.
     */
    async findById(userId: string, id: string) {
        const commission = await prisma.commission.findFirst({
            where: { id, userId },
            include: {
                dealer: { select: { id: true, name: true, phone: true } },
                commissionPolicies: {
                    orderBy: { startDate: 'desc' },
                },
            },
        });

        if (!commission) throw Object.assign(new Error('Commission record not found'), { statusCode: 404 });
        return commission;
    }

    /**
     * Update status or notes of a commission record.
     */
    async update(userId: string, id: string, data: CommissionUpdateInput) {
        const commission = await prisma.commission.findFirst({ where: { id, userId } });
        if (!commission) throw Object.assign(new Error('Commission record not found'), { statusCode: 404 });

        return prisma.commission.update({
            where: { id },
            data: {
                ...(data.status !== undefined && { status: data.status }),
                ...(data.notes !== undefined && { notes: data.notes }),
            },
            include: {
                dealer: { select: { id: true, name: true } },
            },
        });
    }

    /**
     * Delete a commission record (and its policy snapshots via cascade).
     */
    async delete(userId: string, id: string) {
        const commission = await prisma.commission.findFirst({ where: { id, userId } });
        if (!commission) throw Object.assign(new Error('Commission record not found'), { statusCode: 404 });

        return prisma.commission.delete({ where: { id } });
    }
}

export const commissionService = new CommissionService();
