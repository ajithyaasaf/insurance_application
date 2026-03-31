import { z } from 'zod';

// ─── Allowed enums ───────────────────────────────────────
export const ReportSource = z.enum([
    'policies',
    'payments',
    'claims',
    'customers',
    'followups',
]);
export type ReportSource = z.infer<typeof ReportSource>;

export const ReportGroupBy = z.enum([
    'company',
    'dealer',
    'policyType',
    'vehicleClass',
    'status',
    'month',
]);
export type ReportGroupBy = z.infer<typeof ReportGroupBy>;

export const ExportFormat = z.enum(['xlsx', 'pdf']);
export type ExportFormat = z.infer<typeof ExportFormat>;

// ─── Shared filter object ────────────────────────────────
const filtersSchema = z.object({
    companyId:    z.string().uuid().optional(),
    dealerId:     z.string().uuid().optional(),
    customerId:   z.string().uuid().optional(),
    policyType:   z.string().optional(),
    vehicleClass: z.string().optional(),
    status:       z.string().optional(),
    dateFrom:     z.string().optional(),   // ISO date string
    dateTo:       z.string().optional(),
}).strict().optional();

// ─── POST /api/reports/generate ──────────────────────────
export const reportGenerateSchema = z.object({
    body: z.object({
        source:   ReportSource,
        filters:  filtersSchema,
        groupBy:  ReportGroupBy.optional(),
        page:     z.number().int().min(1).default(1),
        limit:    z.number().int().min(1).max(500).default(50),
    }),
});

// ─── POST /api/reports/export ────────────────────────────
export const reportExportSchema = z.object({
    body: z.object({
        source:   ReportSource,
        filters:  filtersSchema,
        groupBy:  ReportGroupBy.optional(),
        format:   ExportFormat,
        columns:  z.array(z.string()).optional(),
        title:    z.string().optional(),
    }),
});
