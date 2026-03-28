import { Request, Response, NextFunction } from 'express';
import { dealerService } from './dealer.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class DealerController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const dealer = await dealerService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Dealer created successfully', data: dealer });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search } = req.query as any;
            const result = await dealerService.findAll(req.user!.userId, +page || 1, +limit || 20, search);
            sendSuccess({ res, statusCode: 200, message: 'Dealers fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const dealer = await dealerService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Dealer found', data: dealer });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const dealer = await dealerService.update(req.user!.userId, req.user!.role, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Dealer updated successfully', data: dealer });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await dealerService.delete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Dealer deleted successfully' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }
}

export const dealerController = new DealerController();
