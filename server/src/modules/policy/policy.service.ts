import prisma from '../../utils/prisma';
import { Prisma } from '@prisma/client';

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
                createdBy: role,
                updatedBy: role,
            },
            include: { customer: true, company: true },
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
            ...(status && { status: status as any }),
            ...(policyType && { policyType: policyType as any }),
            ...(companyId && { companyId }),
        };

        const [data, total] = await Promise.all([
            prisma.policy.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { customer: true, company: true },
            }),
            prisma.policy.count({ where }),
        ]);

        return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }

    async findById(userId: string, id: string) {
        const policy = await prisma.policy.findFirst({
            where: { id, userId, deletedAt: null },
            include: {
                customer: true,
                company: true,
                parentPolicy: true,
                renewals: { where: { deletedAt: null } },
                claims: true,
                payments: { orderBy: { dueDate: 'desc' } },
            },
        });

        if (!policy) throw Object.assign(new Error('Policy not found'), { statusCode: 404 });
        const hasNCB = policy.claims.length === 0;
        return { ...policy, hasNCB };
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

        return prisma.policy.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                policyType: data.policyType as any,
                premiumMode: data.premiumMode as any,
                status: data.status as any,
                updatedBy: role,
            },
            include: { customer: true, company: true },
        });
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
                    createdBy: role,
                    updatedBy: role,
                },
                include: { customer: true, company: true },
            });

            return renewedPolicy;
        });
    }
}

export const policyService = new PolicyService();
