import { z } from 'zod';

export const createDealerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
});

export const updateDealerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
    }),
});

export type CreateDealerInput = z.infer<typeof createDealerSchema>['body'];
export type UpdateDealerInput = z.infer<typeof updateDealerSchema>['body'];
