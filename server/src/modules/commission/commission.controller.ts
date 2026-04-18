import { Request, Response, NextFunction } from 'express';
import { commissionService } from './commission.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { reportService } from '../report/report.service';

export class CommissionController {
    async getPending(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await commissionService.getPending((req as any).user.userId);
            sendSuccess({ res, statusCode: 200, message: 'Pending commissions fetched', data: result });
        } catch (err) { next(err); }
    }

    async preview(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await commissionService.preview((req as any).user.userId, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Commission preview calculated', data: result });
        } catch (err) { next(err); }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await commissionService.create((req as any).user.userId, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Commission record saved', data: result });
        } catch (err) { next(err); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { dealerId, status, dateFrom, dateTo } = req.query;
            const result = await commissionService.findAll(
                (req as any).user.userId,
                dealerId as string | undefined,
                status as string | undefined,
                dateFrom as string | undefined,
                dateTo as string | undefined
            );
            sendSuccess({ res, statusCode: 200, message: 'Commission records fetched', data: result });
        } catch (err) { next(err); }
    }

    async exportExcel(req: Request, res: Response, next: NextFunction) {
        try {
            const { dealerId, status, dateFrom, dateTo } = req.body;
            const history = await commissionService.findAll(
                (req as any).user.userId,
                dealerId as string | undefined,
                status as string | undefined,
                dateFrom as string | undefined,
                dateTo as string | undefined
            );

            if (!history.length) {
                sendError({ res, statusCode: 400, message: 'No records found to export' });
                return;
            }

            const data = history.map(c => ({
                dealerName: c.dealer?.name || 'Unknown',
                period: `${c.periodStart.toISOString().split('T')[0]} - ${c.periodEnd.toISOString().split('T')[0]}`,
                odPercentage: `${c.odPercentage}%`,
                tpPercentage: `${c.tpPercentage}%`,
                totalPolicies: c._count?.commissionPolicies || 0,
                totalCommission: `Rs. ${c.totalCommission.toFixed(2)}`,
                status: c.status.toUpperCase(),
                notes: c.notes || ''
            }));

            const cols = [
                { key: 'dealerName', label: 'Dealer Name' },
                { key: 'period', label: 'Processing Period' },
                { key: 'odPercentage', label: 'OD %' },
                { key: 'tpPercentage', label: 'TP %' },
                { key: 'totalPolicies', label: 'Total Policies' },
                { key: 'totalCommission', label: 'Total Commission' },
                { key: 'status', label: 'Status' },
                { key: 'notes', label: 'Notes' },
            ];

            const buffer = await reportService.exportXlsx(data, cols, 'Commission History Report');

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Commission_History.xlsx`);
            res.send(buffer);
        } catch (err) { next(err); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await commissionService.findById((req as any).user.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Commission record fetched', data: result });
        } catch (err) { next(err); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await commissionService.update(
                (req as any).user.userId,
                req.params.id as string,
                req.body
            );
            sendSuccess({ res, statusCode: 200, message: 'Commission record updated', data: result });
        } catch (err) { next(err); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await commissionService.delete((req as any).user.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Commission record deleted' });
        } catch (err) { next(err); }
    }
}

export const commissionController = new CommissionController();
