import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service';
import { sendSuccess } from '../../utils/apiResponse';

export class ReportController {

    // POST /api/reports/generate
    async generate(req: Request, res: Response, next: NextFunction) {
        try {
            const { source, filters, groupBy, page = 1, limit = 50 } = req.body;
            const data = await reportService.generateReport(req.user!.userId, {
                source, filters, groupBy, page, limit,
            });
            sendSuccess({ res, statusCode: 200, message: 'Report generated', data });
        } catch (e: any) { next(e); }
    }

    // GET /api/reports/dashboard
    async dashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
            const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
            const data = await reportService.getDashboardReport(req.user!.userId, { dateFrom, dateTo });
            sendSuccess({ res, statusCode: 200, message: 'Dashboard analytics', data });
        } catch (e: any) { next(e); }
    }

    // POST /api/reports/export
    async exportReport(req: Request, res: Response, next: NextFunction) {
        try {
            const { source, filters, groupBy, format, columns, title } = req.body;

            // Fetch ALL data (no pagination for export)
            const result = await reportService.generateReport(req.user!.userId, {
                source, filters, groupBy, page: 1, limit: 10000,
            });

            const reportData = result.data || [];
            const reportColumns = columns
                ? (result.columns || []).filter((c: any) => columns.includes(c.key))
                : result.columns || [];

            if (format === 'xlsx') {
                const buffer = await reportService.exportXlsx(reportData, reportColumns, title);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.xlsx"`);
                res.send(buffer);
            } else {
                const buffer = await reportService.exportPdf(reportData, reportColumns, title);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.pdf"`);
                res.send(buffer);
            }
        } catch (e: any) { next(e); }
    }
}

export const reportController = new ReportController();
