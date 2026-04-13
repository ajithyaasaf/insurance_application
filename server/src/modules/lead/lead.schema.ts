import { z } from 'zod';

export const createLeadSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phone: z.string().optional(),
        interestedProduct: z.string().optional(),
        status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
        nextFollowUpDate: z.string().datetime().optional().or(z.string().optional()),
        notes: z.string().optional(),
        
        // Optional Policy/Quote Draft Fields
        policyType: z.enum(['motor', 'health', 'life', 'other']).optional(),
        companyId: z.string().optional().or(z.literal('')),
        vehicleNumber: z.string().optional().or(z.literal('')),
        make: z.string().optional().or(z.literal('')),
        model: z.string().optional().or(z.literal('')),
        vehicleClass: z.enum(['TW', 'CVP', 'PVT', 'GCV', 'Misc_D', 'CCP', 'Fire', 'Public_Liability', 'Others']).optional(),
        idv: z.number().min(0).optional(),
        od: z.number().min(0).optional(),
        tp: z.number().min(0).optional(),
        tax: z.number().min(0).optional(),
        totalPremium: z.number().min(0).optional(),
        premiumAmount: z.number().min(0).optional(),
        startDate: z.string().optional(),
        expiryDate: z.string().optional(),
        dealerId: z.string().optional().or(z.literal('')),
    }),
});

export const updateLeadSchema = z.object({
    body: z.object({
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        interestedProduct: z.string().optional(),
        status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
        nextFollowUpDate: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),

        // Optional Policy/Quote Draft Fields
        policyType: z.enum(['motor', 'health', 'life', 'other']).optional(),
        companyId: z.string().optional().or(z.literal('')),
        vehicleNumber: z.string().optional().or(z.literal('')),
        make: z.string().optional().or(z.literal('')),
        model: z.string().optional().or(z.literal('')),
        vehicleClass: z.enum(['TW', 'CVP', 'PVT', 'GCV', 'Misc_D', 'CCP', 'Fire', 'Public_Liability', 'Others']).optional(),
        idv: z.number().min(0).optional(),
        od: z.number().min(0).optional(),
        tp: z.number().min(0).optional(),
        tax: z.number().min(0).optional(),
        totalPremium: z.number().min(0).optional(),
        premiumAmount: z.number().min(0).optional(),
        startDate: z.string().optional(),
        expiryDate: z.string().optional(),
        dealerId: z.string().optional().or(z.literal('')),
    }),
    params: z.object({
        id: z.string().uuid(),
    }),
});

export const convertLeadSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
    }),
    body: z.object({
        address: z.string().optional(),
        email: z.string().email().optional(),
    }),
});
