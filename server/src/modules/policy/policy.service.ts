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
    status?: string;
    parentPolicyId?: string;
    lostReason?: string;
    make?: string;
    model?: string;
    vehicleClass?: string;
    idv?: number;
    od?: number;
    tp?: number;
    tax?: number;
    totalPremium?: number;
    paymentMethod?: string;
    dealerId?: string;
}

export class PolicyService {
    async create(userId: string, role: string, data: CreatePolicyInput) {
        // Validate: lost policy must include reason
        if (data.status === 'lost' && !data.lostReason) {
            throw Object.assign(new Error('Lost policy must include a reason'), { statusCode: 400 });
        }

        // Validate: Vehicle number required for motor policies
        if (data.policyType === 'motor' && !data.vehicleNumber) {
            throw Object.assign(new Error('Vehicle number is required for motor policies'), { statusCode: 400 });
        }

        return prisma.policy.create({
            data: {
                userId,
                customerId: data.customerId,
                companyId: data.companyId,
                policyNumber: data.policyNumber,
                policyType: data.policyType as any,
                vehicleNumber: data.vehicleNumber,
                startDate: new Date(data.startDate),
                expiryDate: new Date(data.expiryDate),
                sumInsured: data.sumInsured,
                premiumAmount: data.premiumAmount,
                premiumMode: (data.premiumMode as any) || 'yearly',
                productName: data.productName,
                noOfYears: data.noOfYears || 1,
                status: (data.status as any) || 'active',
                parentPolicyId: data.parentPolicyId,
                lostReason: data.lostReason,
                make: data.make,
                model: data.model,
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
    }

    async findAll(
        userId: string,
        page = 1,
        limit = 20,
        search?: string,
        status?: string,
        policyType?: string,
        companyId?: string
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
        };

        const total = await prisma.policy.count({ where });
        const policies = await prisma.policy.findMany({
            where,
            include: { customer: true, company: true, dealer: true },
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
        const hasNCB = policy.claims.filter(c => c.status !== 'REJECTED').length === 0;
        return mapPolicyStatus({ ...policy, hasNCB });
    }

    async update(userId: string, role: string, id: string, data: Partial<CreatePolicyInput>) {
        const policy = await this.findById(userId, id);

        if (data.status === 'lost' && !data.lostReason) {
            throw Object.assign(new Error('Lost policy must include a reason'), { statusCode: 400 });
        }

        const newPolicyType = data.policyType || policy.policyType;
        const newVehicleNumber = data.vehicleNumber !== undefined ? data.vehicleNumber : policy.vehicleNumber;
        if (newPolicyType === 'motor' && !newVehicleNumber) {
            throw Object.assign(new Error('Vehicle number is required for motor policies'), { statusCode: 400 });
        }

        const updatedPolicy = await prisma.policy.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                policyType: data.policyType as any,
                premiumMode: data.premiumMode as any,
                status: data.status as any,
                vehicleClass: data.vehicleClass as any,
                updatedBy: role,
            },
            include: { customer: true, company: true, dealer: true },
        });

        return mapPolicyStatus(updatedPolicy);
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id);
        return prisma.policy.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    // Renewal = create a new policy linked via parentPolicyId using $transaction
    async renew(userId: string, role: string, id: string, data: Partial<CreatePolicyInput>) {
        const originalPolicy = await this.findById(userId, id);

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
                    expiryDate: new Date(data.expiryDate!),
                    sumInsured: data.sumInsured ?? originalPolicy.sumInsured,
                    premiumAmount: data.premiumAmount ?? originalPolicy.premiumAmount,
                    premiumMode: (data.premiumMode as any) || originalPolicy.premiumMode,
                    productName: data.productName || originalPolicy.productName,
                    noOfYears: data.noOfYears || originalPolicy.noOfYears,
                    status: 'active',
                    parentPolicyId: id,
                    make: data.make || originalPolicy.make,
                    model: data.model || originalPolicy.model,
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

            return renewedPolicy;
        });
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
