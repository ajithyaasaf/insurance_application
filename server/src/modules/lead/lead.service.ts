import prisma from '../../utils/prisma';
import { Prisma, PolicyType, PolicyVehicleClass } from '@prisma/client';

interface CreateLeadInput {
    name: string;
    phone?: string;
    interestedProduct?: string;
    status?: 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
    nextFollowUpDate?: string;
    notes?: string;
    // Quote Fields
    policyType?: PolicyType;
    companyId?: string;
    vehicleNumber?: string;
    make?: string;
    model?: string;
    vehicleClass?: PolicyVehicleClass;
    idv?: number;
    od?: number;
    tp?: number;
    tax?: number;
    totalPremium?: number;
    premiumAmount?: number;
    startDate?: string;
    expiryDate?: string;
    dealerId?: string;
}

interface UpdateLeadInput {
    name?: string;
    phone?: string;
    interestedProduct?: string;
    status?: 'new' | 'contacted' | 'interested' | 'converted' | 'lost';
    nextFollowUpDate?: string | null;
    notes?: string | null;
    // Quote Fields
    policyType?: PolicyType;
    companyId?: string;
    vehicleNumber?: string;
    make?: string;
    model?: string;
    vehicleClass?: PolicyVehicleClass;
    idv?: number;
    od?: number;
    tp?: number;
    tax?: number;
    totalPremium?: number;
    premiumAmount?: number;
    startDate?: string;
    expiryDate?: string;
    dealerId?: string;
}

export class LeadService {
    async create(userId: string, role: string, data: CreateLeadInput) {
        return prisma.lead.create({
            data: {
                userId,
                name: data.name,
                phone: data.phone,
                interestedProduct: data.interestedProduct,
                status: data.status || 'new',
                nextFollowUpDate: data.nextFollowUpDate
                    ? new Date(data.nextFollowUpDate)
                    : null,
                notes: data.notes,
                
                // Quote Fields
                policyType: data.policyType,
                companyId: data.companyId || null,
                vehicleNumber: data.vehicleNumber || null,
                make: data.make || null,
                model: data.model || null,
                vehicleClass: data.vehicleClass || null,
                idv: data.idv,
                od: data.od,
                tp: data.tp,
                tax: data.tax,
                totalPremium: data.totalPremium,
                premiumAmount: data.premiumAmount,
                startDate: data.startDate ? new Date(data.startDate) : null,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
                dealerId: data.dealerId || null,

                createdBy: role,
                updatedBy: role,
            },
        });
    }

    async findAll(
        userId: string,
        page: number = 1,
        limit: number = 20,
        search?: string,
        status?: string,
        excludeConverted?: boolean
    ) {
        const where: any = {
            userId,
            deletedAt: null,
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ],
            }),
            ...(status ? { status: status as any } : (excludeConverted ? { status: { not: 'converted' } } : {})),
        };

        const [data, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.lead.count({ where }),
        ]);

        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findById(userId: string, id: string) {
        const lead = await prisma.lead.findFirst({
            where: { id, userId, deletedAt: null },
        });

        if (!lead) {
            throw Object.assign(new Error('Lead not found'), { statusCode: 404 });
        }

        return lead;
    }

    async update(userId: string, role: string, id: string, data: UpdateLeadInput) {
        await this.findById(userId, id);

        return prisma.lead.update({
            where: { id },
            data: {
                ...data,
                nextFollowUpDate: data.nextFollowUpDate
                    ? new Date(data.nextFollowUpDate)
                    : data.nextFollowUpDate === null
                        ? null
                        : undefined,
                
                // Process dates if provided
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
                companyId: data.companyId || undefined,
                vehicleNumber: data.vehicleNumber || undefined,
                make: data.make || undefined,
                model: data.model || undefined,
                dealerId: data.dealerId || undefined,

                updatedBy: role,
            },
        });
    }

    async softDelete(userId: string, id: string) {
        await this.findById(userId, id);

        return prisma.lead.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async convertToCustomer(
        userId: string,
        role: string,
        id: string,
        extra: { address?: string; email?: string }
    ) {
        const lead = await this.findById(userId, id);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Customer
            const customer = await tx.customer.create({
                data: {
                    userId,
                    name: lead.name,
                    phone: lead.phone,
                    email: extra.email,
                    address: extra.address,
                    createdBy: role,
                    updatedBy: role,
                },
            });

            // 2. Mark Lead as converted and clear nextFollowUpDate as it's now a Policy/Customer
            await tx.lead.update({
                where: { id },
                data: {
                    status: 'converted',
                    nextFollowUpDate: null,
                    updatedBy: role,
                },
            });

            // 3. Auto-create Policy and initial Payment if quote data exists
            if (lead.policyType && lead.premiumAmount !== null && lead.startDate && lead.expiryDate && lead.companyId) {
                const policy = await tx.policy.create({
                    data: {
                        userId,
                        customerId: customer.id,
                        companyId: lead.companyId,
                        policyType: lead.policyType,
                        premiumAmount: lead.premiumAmount!,
                        startDate: lead.startDate,
                        expiryDate: lead.expiryDate,
                        
                        // Motor fields
                        vehicleNumber: lead.vehicleNumber,
                        make: lead.make,
                        model: lead.model,
                        vehicleClass: lead.vehicleClass,
                        idv: lead.idv,
                        od: lead.od,
                        tp: lead.tp,
                        tax: lead.tax,
                        totalPremium: lead.totalPremium,
                        dealerId: lead.dealerId,
                        
                        status: 'active',
                        createdBy: role,
                        updatedBy: role,
                    }
                });

                // Create initial payment record
                await tx.payment.create({
                    data: {
                        userId,
                        policyId: policy.id,
                        customerId: customer.id,
                        amount: policy.premiumAmount,
                        dueDate: policy.startDate, // Due on policy start
                        status: 'pending',
                        createdBy: role,
                    }
                });
            }

            return customer;
        });

        return result;
    }
}

export const leadService = new LeadService();
