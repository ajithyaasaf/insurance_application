import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';
import { buildStatusFilter, mapPolicyStatus, getStartOfTodayIST } from '../../utils/date';

interface CreatePolicyInput {
    customerId: string;
    companyId: string;
    policyNumber?: string;
    policyType: string;
    vehicleNumber?: string;
    startDate: string;
    expiryDate: string;
    sumInsured?: number;
    premiumAmount: number;
    premiumMode?: string;
    productName?: string;
    noOfYears?: number;
    parentPolicyId?: string;
    make?: string;
    model?: string;
    vehicleClass?: string;
    idv?: number;
    od?: number;
    tp?: number;
    tax?: number;
    totalPremium?: number;
    paymentMethod?: string;
    paidAmount?: number;
    dealerId?: string;
    registrationDate?: string;
}

/** Only these two statuses can be set manually on an existing policy. */
type ManualPolicyStatus = 'active' | 'cancelled';

export class PolicyService {
    async create(userId: string, role: string, data: CreatePolicyInput) {
        // 1. Date Validation: Expiry must be after Start
        const start = new Date(data.startDate);
        const expiry = new Date(data.expiryDate);
        if (expiry <= start) {
            throw Object.assign(new Error('Expiry date must be after the start date'), { statusCode: 400 });
        }

        // --- Smart Premium Pre-calculation ---
        if (!data.premiumAmount && (data.od || data.tp)) {
            data.premiumAmount = (data.od || 0) + (data.tp || 0);
        }
        if (!data.totalPremium && (data.premiumAmount || data.tax)) {
            data.totalPremium = (data.premiumAmount || 0) + (data.tax || 0);
        }

        // Status is always forced to 'active' on creation — the system handles expiry automatically

        // Validate: Vehicle number required for motor policies
        if (data.policyType === 'motor' && !data.vehicleNumber) {
            throw Object.assign(new Error('Vehicle number is required for motor policies'), { statusCode: 400 });
        }

        // 2. Cross-tenant ownership validation for Customer and Dealer
        const [customer, dealer] = await Promise.all([
            prisma.customer.findFirst({ where: { id: data.customerId, userId, deletedAt: null } }),
            data.dealerId ? prisma.dealer.findFirst({ where: { id: data.dealerId, userId, deletedAt: null } }) : Promise.resolve(null),
        ]);

        if (!customer) throw Object.assign(new Error('Customer not found or unauthorized'), { statusCode: 404 });
        if (data.dealerId && !dealer) throw Object.assign(new Error('Dealer not found or unauthorized'), { statusCode: 404 });

        return prisma.$transaction(async (tx) => {
            const policy = await tx.policy.create({
                data: {
                    userId,
                    customerId: data.customerId,
                    companyId: data.companyId,
                    policyNumber: data.policyNumber,
                    policyType: data.policyType as any,
                    vehicleNumber: data.vehicleNumber,
                    startDate: start,
                    expiryDate: expiry,
                    sumInsured: data.policyType === 'motor' ? null : data.sumInsured,
                    premiumAmount: data.premiumAmount,
                    premiumMode: (data.premiumMode as any) || 'yearly',
                    productName: data.policyType === 'motor' ? null : data.productName,
                    noOfYears: data.noOfYears || 1,
                    status: 'active', // Always active on creation; system auto-expires by date
                    parentPolicyId: data.parentPolicyId,
                    make: data.make,
                    model: data.model,
                    registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
                    vehicleClass: data.vehicleClass as any,
                    idv: data.idv,
                    od: data.od,
                    tp: data.tp,
                    tax: data.tax,
                    totalPremium: data.totalPremium,
                    paymentMethod: data.paymentMethod,
                    dealerId: data.dealerId,
                    createdBy: role,
                    updatedBy: role,
                },
                include: { customer: true, company: true, dealer: true },
            });

            const paidAmount = data.paidAmount || 0;
            const fullPremium = policy.totalPremium || policy.premiumAmount; // Smart fallback: uses total if provided, else base premium

            if (paidAmount > fullPremium + 0.01) {
                throw Object.assign(new Error(`Paid amount (${paidAmount}) cannot exceed the premium (${fullPremium})`), { statusCode: 400 });
            }

            if (paidAmount >= fullPremium - 0.01 && fullPremium > 0) {
                // Scenario 1: Fully Paid at creation
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: policy.id,
                        customerId: data.customerId,
                        amount: fullPremium,
                        paidAmount: fullPremium,
                        paidDate: new Date(),
                        dueDate: policy.startDate,
                        status: 'paid',
                        createdBy: role,
                    }
                });
            } else if (paidAmount > 0.01) {
                // Scenario 2: Partial Payment at creation (Split into two records)
                // A. The Paid portion
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: policy.id,
                        customerId: data.customerId,
                        amount: paidAmount,
                        paidAmount: paidAmount,
                        paidDate: new Date(),
                        dueDate: policy.startDate,
                        status: 'paid',
                        createdBy: role,
                    }
                });
                // B. The Pending balance
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: policy.id,
                        customerId: data.customerId,
                        amount: fullPremium - paidAmount,
                        dueDate: policy.startDate,
                        status: 'pending',
                        createdBy: role,
                    }
                });
            } else {
                // Scenario 3: Nothing paid (Single pending record)
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: policy.id,
                        customerId: data.customerId,
                        amount: fullPremium,
                        dueDate: policy.startDate,
                        status: 'pending',
                        createdBy: role,
                    }
                });
            }

            return policy;
        });
    }

    async findAll(
        userId: string,
        page = 1,
        limit = 20,
        search?: string,
        status?: string,
        policyType?: string,
        companyId?: string,
        dealerId?: string
    ) {
        const where: any = {
            userId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { customer: { name: { contains: search, mode: 'insensitive' } } },
                    { policyNumber: { contains: search, mode: 'insensitive' } },
                    { vehicleNumber: { contains: search, mode: 'insensitive' } },
                ],
            }),
            ...(status ? buildStatusFilter(status) : {}),
            ...(policyType && { policyType: policyType as any }),
            ...(companyId && { companyId }),
            ...(dealerId && { dealerId }),
        };

        const total = await prisma.policy.count({ where });
        const policies = await prisma.policy.findMany({
            where,
            include: { 
                customer: true, 
                company: true, 
                dealer: true,
                _count: {
                    select: {
                        renewals: { where: { deletedAt: null } },
                        payments: { where: { status: 'pending' } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data: policies.map(mapPolicyStatus),
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    async findById(userId: string, id: string) {
        const policy = await prisma.policy.findFirst({
            where: { id, userId, deletedAt: null },
            include: {
                customer: true,
                company: true,
                dealer: true,
                parentPolicy: true,
                renewals: { where: { deletedAt: null } },
                claims: true,
                payments: { orderBy: { dueDate: 'desc' } },
            },
        });

        if (!policy) throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
        
        // Calculate financial summary
        const effectivePremium = policy.totalPremium || policy.premiumAmount;
        const totalPaid = policy.payments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const paymentSummary = {
            totalPremium: effectivePremium,
            totalPaid,
            balanceDue: Math.max(0, effectivePremium - totalPaid)
        };

        const hasNCB = policy.claims.filter(c => c.status !== 'REJECTED').length === 0;
        return mapPolicyStatus({ ...policy, hasNCB, paymentSummary });
    }

    async update(userId: string, role: string, id: string, data: Partial<CreatePolicyInput>) {
        const policy = await this.findById(userId, id);

        // --- Smart Premium Pre-calculation ---
        const od = data.od !== undefined ? data.od : policy.od;
        const tp = data.tp !== undefined ? data.tp : policy.tp;
        const tax = data.tax !== undefined ? data.tax : policy.tax;

        if (data.premiumAmount === undefined && (data.od !== undefined || data.tp !== undefined)) {
            data.premiumAmount = (od || 0) + (tp || 0);
        }
        if (data.totalPremium === undefined && (data.premiumAmount !== undefined || data.tax !== undefined)) {
            data.totalPremium = (data.premiumAmount || policy.premiumAmount || 0) + (tax || 0);
        }

        // 1. Date Validation: Expiry must be after Start
        const newStart = data.startDate ? new Date(data.startDate) : policy.startDate;
        const newExpiry = data.expiryDate ? new Date(data.expiryDate) : policy.expiryDate;
        if (newExpiry <= newStart) {
            throw Object.assign(new Error('Expiry date must be after the start date'), { statusCode: 400 });
        }

        // 2. Ownership validation for changed Customer/Dealer
        if (data.customerId && data.customerId !== policy.customerId) {
            const customer = await prisma.customer.findFirst({ where: { id: data.customerId, userId, deletedAt: null } });
            if (!customer) throw Object.assign(new Error('Target customer not found or unauthorized'), { statusCode: 404 });
        }
        if (data.dealerId && data.dealerId !== policy.dealerId) {
            const dealer = await prisma.dealer.findFirst({ where: { id: data.dealerId, userId, deletedAt: null } });
            if (!dealer) throw Object.assign(new Error('Target dealer not found or unauthorized'), { statusCode: 404 });
        }

        // 3. Validate manual status changes — only 'active' (reinstatement) or 'cancelled' are permitted
        const incomingStatus = (data as any).status as ManualPolicyStatus | undefined;
        if (incomingStatus && incomingStatus !== 'active' && incomingStatus !== 'cancelled') {
            throw Object.assign(new Error('Status can only be manually set to active or cancelled'), { statusCode: 400 });
        }

        // Resolve cancellation timestamp
        let cancelledAt: Date | null | undefined;
        if (incomingStatus === 'cancelled' && policy.status !== 'cancelled') {
            cancelledAt = new Date(); // First time being cancelled
        } else if (incomingStatus === 'active' && policy.status === 'cancelled') {
            cancelledAt = null; // Reinstatement — clear the cancellation timestamp
        }

        const newPolicyType = data.policyType || policy.policyType;
        const newVehicleNumber = data.vehicleNumber !== undefined ? data.vehicleNumber : policy.vehicleNumber;
        if (newPolicyType === 'motor' && !newVehicleNumber) {
            throw Object.assign(new Error('Vehicle number is required for motor policies'), { statusCode: 400 });
        }

        // Use transaction to sync premium changes to pending payments if needed
        return prisma.$transaction(async (tx) => {
            const updatedPolicy = await tx.policy.update({
                where: { id },
                data: {
                    ...data,
                    startDate: data.startDate ? new Date(data.startDate) : undefined,
                    expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                    policyType: data.policyType as any,
                    premiumMode: data.premiumMode as any,
                    status: incomingStatus as any,
                    cancelledAt,
                    registrationDate: data.registrationDate ? new Date(data.registrationDate) : undefined,
                    vehicleClass: data.vehicleClass as any,
                    updatedBy: role,
                    lostReason: undefined, // Ensure stale field never persists
                } as any,

                include: { customer: true, company: true, dealer: true },
            });

            // IF premiumAmount or totalPremium changed, adjust the 'pending' payment placeholder
            const oldEffective = policy.totalPremium || policy.premiumAmount;
            const newEffective = updatedPolicy.totalPremium || updatedPolicy.premiumAmount;

            if (newEffective !== oldEffective) {
                // 1. Calculate how much has already been paid across all non-pending records
                const collections = await tx.payment.aggregate({
                    where: { policyId: id, userId, status: { not: 'pending' } },
                    _sum: { paidAmount: true }
                });
                const totalCollected = collections._sum.paidAmount || 0;
                const newBalance = Math.max(0, newEffective - totalCollected);

                // 2. Update the pending placeholder to the new balance
                await tx.payment.updateMany({
                    where: {
                        policyId: id,
                        userId,
                        status: 'pending'
                    },
                    data: {
                        amount: newBalance
                    }
                });
            }

            return mapPolicyStatus(updatedPolicy);
        });
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id); // ownership check

        // Recursive soft delete in a transaction
        return prisma.$transaction(async (tx) => {
            const now = new Date();

            // Delete child payments
            await tx.payment.deleteMany({ where: { policyId: id, userId } });

            // Delete child claims
            await tx.claim.deleteMany({ where: { policyId: id, userId } });

            // Delete child follow-ups
            await tx.followUp.deleteMany({ where: { policyId: id, userId } });

            return tx.policy.update({
                where: { id },
                data: { deletedAt: now }
            });
        });
    }

    // Renewal = create a new policy linked via parentPolicyId using $transaction
    async renew(userId: string, role: string, id: string, data: Partial<CreatePolicyInput>) {
        const originalPolicy = await this.findById(userId, id);

        // --- Smart Premium Pre-calculation for Renewal ---
        const od = data.od !== undefined ? data.od : originalPolicy.od;
        const tp = data.tp !== undefined ? data.tp : originalPolicy.tp;
        const tax = data.tax !== undefined ? data.tax : originalPolicy.tax;

        if (data.premiumAmount === undefined && (data.od !== undefined || data.tp !== undefined)) {
            data.premiumAmount = (Number(od) || 0) + (Number(tp) || 0);
        }
        if (data.totalPremium === undefined && (data.premiumAmount !== undefined || data.tax !== undefined)) {
            data.totalPremium = (data.premiumAmount || originalPolicy.premiumAmount || 0) + (Number(tax) || 0);
        }

        // Date validation: same rule as create/update — expiry must be strictly after start
        const newStart = data.startDate ? new Date(data.startDate) : new Date(originalPolicy.expiryDate);
        const newExpiry = data.expiryDate ? new Date(data.expiryDate) : null;
        if (!newExpiry) {
            throw Object.assign(new Error('Expiry date is required for renewal'), { statusCode: 400 });
        }
        if (newExpiry <= newStart) {
            throw Object.assign(new Error('Renewal expiry date must be after the start date'), { statusCode: 400 });
        }

        return prisma.$transaction(async (tx: any) => {
            // Mark original as expired
            await tx.policy.update({
                where: { id },
                data: { status: 'expired', updatedBy: role },
            });

            // Create renewed policy
            const renewedPolicy = await tx.policy.create({
                data: {
                    userId,
                    customerId: originalPolicy.customerId,
                    companyId: data.companyId || originalPolicy.companyId,
                    policyNumber: data.policyNumber,
                    policyType: originalPolicy.policyType,
                    vehicleNumber: data.vehicleNumber || originalPolicy.vehicleNumber,
                    startDate: data.startDate ? new Date(data.startDate) : new Date(),
                    expiryDate: newExpiry,
                    sumInsured: data.sumInsured ?? originalPolicy.sumInsured,
                    premiumAmount: data.premiumAmount ?? originalPolicy.premiumAmount,
                    premiumMode: (data.premiumMode as any) || originalPolicy.premiumMode,
                    productName: data.productName || originalPolicy.productName,
                    noOfYears: data.noOfYears || originalPolicy.noOfYears,
                    status: 'active',
                    parentPolicyId: id,
                    make: data.make || originalPolicy.make,
                    model: data.model || originalPolicy.model,
                    registrationDate: data.registrationDate ? new Date(data.registrationDate) : originalPolicy.registrationDate,
                    vehicleClass: (data.vehicleClass as any) || originalPolicy.vehicleClass,
                    idv: data.idv ?? originalPolicy.idv,
                    od: data.od ?? originalPolicy.od,
                    tp: data.tp ?? originalPolicy.tp,
                    tax: data.tax ?? originalPolicy.tax,
                    totalPremium: data.totalPremium ?? originalPolicy.totalPremium,
                    paymentMethod: data.paymentMethod || originalPolicy.paymentMethod,
                    dealerId: data.dealerId || originalPolicy.dealerId,
                    createdBy: role,
                    updatedBy: role,
                },
                include: { customer: true, company: true, dealer: true },
            });

            // 3. Derive payment status and split records if needed
            const paidAmount = data.paidAmount || 0;
            const fullPremium = renewedPolicy.totalPremium || renewedPolicy.premiumAmount; // Smart fallback for renewal

            if (paidAmount > fullPremium + 0.01) {
                throw Object.assign(new Error(`Paid amount (${paidAmount}) cannot exceed the premium (${fullPremium})`), { statusCode: 400 });
            }

            if (paidAmount >= fullPremium - 0.01 && fullPremium > 0) {
                // Scenario 1: Fully Paid at renewal
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: renewedPolicy.id,
                        customerId: originalPolicy.customerId,
                        amount: fullPremium,
                        paidAmount: fullPremium,
                        paidDate: new Date(),
                        dueDate: renewedPolicy.startDate,
                        status: 'paid',
                        createdBy: role,
                    }
                });
            } else if (paidAmount > 0.01) {
                // Scenario 2: Partial Payment at renewal
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: renewedPolicy.id,
                        customerId: originalPolicy.customerId,
                        amount: paidAmount,
                        paidAmount: paidAmount,
                        paidDate: new Date(),
                        dueDate: renewedPolicy.startDate,
                        status: 'paid',
                        createdBy: role,
                    }
                });
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: renewedPolicy.id,
                        customerId: originalPolicy.customerId,
                        amount: fullPremium - paidAmount,
                        dueDate: renewedPolicy.startDate,
                        status: 'pending',
                        createdBy: role,
                    }
                });
            } else {
                // Scenario 3: Nothing paid (Pending placeholder)
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: renewedPolicy.id,
                        customerId: originalPolicy.customerId,
                        amount: fullPremium,
                        dueDate: renewedPolicy.startDate,
                        status: 'pending',
                        createdBy: role,
                    }
                });
            }

            return renewedPolicy;
        });
    }

    // Pre-delete check: returns counts of linked records so the frontend can warn the user
    async preDeleteCheck(userId: string, id: string) {
        await this.findById(userId, id); // ownership check

        const [paymentsCount, claimsCount, followUpsCount] = await Promise.all([
            prisma.payment.count({ where: { policyId: id, userId } }),
            prisma.claim.count({ where: { policyId: id, userId } }),
            prisma.followUp.count({ where: { policyId: id, userId } }),
        ]);

        return { paymentsCount, claimsCount, followUpsCount };
    }

    // CRON JOB / STARTUP SWEEP: Automatically hard-expire policies in the DB for clean indexing
    async autoExpirePolicies() {
        const todayIST = getStartOfTodayIST();

        const result = await prisma.policy.updateMany({
            where: {
                status: 'active',
                expiryDate: { lt: todayIST },
                deletedAt: null
            },
            data: {
                status: 'expired',
                updatedBy: 'system' // System auto-update
            }
        });

        return result.count;
    }
}

export const policyService = new PolicyService();
