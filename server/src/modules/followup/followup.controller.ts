import { Request, Response, NextFunction } from 'express';
import { followUpService } from './followup.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class FollowUpController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const followUp = await followUpService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Follow-up created', data: followUp });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, status, date, search } = req.query as any;
            const result = await followUpService.findAll(req.user!.userId, +page || 1, +limit || 20, status, date, search);
            sendSuccess({ res, statusCode: 200, message: 'Follow-ups fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const followUp = await followUpService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Follow-up found', data: followUp });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const followUp = await followUpService.update(req.user!.userId, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Follow-up updated', data: followUp });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await followUpService.delete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Follow-up deleted' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }
}

export const followUpController = new FollowUpController();
