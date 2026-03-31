import { z } from 'zod';

export const createClaimSchema = z.object({
    body: z.object({
        policyId: z.string().min(1, 'Policy ID is required'),
        customerId: z.string().min(1, 'Customer ID is required'),
        claimNumber: z.string().optional().or(z.literal('')),
        claimAmount: z.number().min(0, 'Claim amount must be valid'),
        claimDate: z.string().min(1, 'Claim date is required'),
        status: z.enum(['filed', 'approved', 'rejected', 'settled']).optional(),
        reason: z.string().optional().or(z.literal('')),
    }),
});

export const updateClaimSchema = z.object({
    body: z.object({
        policyId: z.string().optional(),
        customerId: z.string().optional(),
        claimNumber: z.string().optional().or(z.literal('')),
        claimAmount: z.number().min(0).optional(),
        claimDate: z.string().optional(),
        status: z.enum(['filed', 'approved', 'rejected', 'settled']).optional(),
        reason: z.string().optional().or(z.literal('')),
    }),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>['body'];
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>['body'];
