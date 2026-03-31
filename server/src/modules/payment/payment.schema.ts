import { z } from 'zod';

export const createPaymentSchema = z.object({
    body: z.object({
        policyId: z.string().min(1, 'Policy ID is required'),
        customerId: z.string().min(1, 'Customer ID is required'),
        amount: z.number().min(0, 'Amount must be valid'),
        dueDate: z.string().min(1, 'Due date is required'),
        paidDate: z.string().optional().or(z.literal('')),
        paidAmount: z.number().min(0).optional(),
        status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
        notes: z.string().optional().or(z.literal('')),
    }),
});

export const updatePaymentSchema = z.object({
    body: z.object({
        policyId: z.string().optional(),
        customerId: z.string().optional(),
        amount: z.number().min(0).optional(),
        dueDate: z.string().optional(),
        paidDate: z.string().optional().or(z.literal('')),
        paidAmount: z.number().min(0).optional(),
        status: z.enum(['pending', 'partial', 'paid', 'overdue']).optional(),
        notes: z.string().optional().or(z.literal('')),
    }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>['body'];
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>['body'];
