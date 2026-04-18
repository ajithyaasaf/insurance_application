import { z } from 'zod';

export const commissionPreviewSchema = z.object({
    body: z.object({
        dealerId: z.string().uuid(),
        periodStart: z.string(),
        periodEnd: z.string(),
        odPercentage: z.number().min(0).max(100),
        tpPercentage: z.number().min(0).max(100),
    })
});

export const commissionCreateSchema = z.object({
    body: commissionPreviewSchema.shape.body.extend({
        notes: z.string().optional(),
    })
});

export const commissionUpdateSchema = z.object({
    body: z.object({
        status: z.enum(['draft', 'paid']).optional(),
        notes: z.string().optional(),
    }),
    params: z.object({
        id: z.string().uuid(),
    })
});

export type CommissionPreviewInput = z.infer<typeof commissionPreviewSchema>['body'];
export type CommissionCreateInput = z.infer<typeof commissionCreateSchema>['body'];
export type CommissionUpdateInput = z.infer<typeof commissionUpdateSchema>['body'];

