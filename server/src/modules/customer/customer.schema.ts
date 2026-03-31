import { z } from 'zod';

export const createCustomerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
        email: z.string().email('Invalid email address').optional().or(z.literal('')),
        address: z.string().optional(),
    }),
});

export const updateCustomerSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').optional(),
        phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be exactly 10 digits').optional().or(z.literal('')),
        email: z.string().email('Invalid email address').optional().or(z.literal('')),
        address: z.string().optional(),
    }),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>['body'];
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>['body'];
