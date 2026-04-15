import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class PaymentController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const payment = await paymentService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Payment created', data: payment });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, search, dateFrom, dateTo } = req.query as any;
            const result = await paymentService.findAll(req.user!.userId, +page || 1, +limit || 20, status, search, dateFrom, dateTo);
            sendSuccess({ res, statusCode: 200, message: 'Payments fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const payment = await paymentService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Payment found', data: payment });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { payment, message } = await paymentService.update(req.user!.userId, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message, data: payment });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await paymentService.delete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Payment deleted' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async detectOverdue(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await paymentService.detectOverdue(req.user!.userId);
            sendSuccess({ res, statusCode: 200, message: `${result.updated} overdue payment(s) detected`, data: result });
        } catch (e: any) { next(e); }
    }
}

export const paymentController = new PaymentController();


