import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service';
import { sendSuccess } from '../../utils/apiResponse';

export class DashboardController {
    async getSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await dashboardService.getSummary(req.user!.userId);
            sendSuccess({ res, statusCode: 200, message: 'Dashboard summary', data });
        } catch (e: any) { next(e); }
    }
}

export const dashboardController = new DashboardController();
