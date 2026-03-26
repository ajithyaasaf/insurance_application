import { z } from 'zod';

export const createLeadSchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required'),
        phone: z.string().optional(),
        interestedProduct: z.string().optional(),
        status: z.enum(['new', 'contacted', 'interested', 'converted', 'lost']).optional(),
        nextFollowUpDate: z.string().datetime().optional().or(z.string().optional()),
        notes: z.string().optional(),
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
