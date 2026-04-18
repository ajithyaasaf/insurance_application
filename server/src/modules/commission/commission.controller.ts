import { Request, Response, NextFunction } from 'express';
import { commissionService } from './commission.service';
import { sendSuccess } from '../../utils/apiResponse';

export class CommissionController {
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
            const { dealerId } = req.query;
            const result = await commissionService.findAll(
                (req as any).user.userId,
                dealerId as string | undefined
            );
            sendSuccess({ res, statusCode: 200, message: 'Commission records fetched', data: result });
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
