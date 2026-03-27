import { Request, Response, NextFunction } from 'express';
import { claimService } from './claim.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class ClaimController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const claim = await claimService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Claim filed', data: claim });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search } = req.query as any;
            const result = await claimService.findAll(req.user!.userId, +page || 1, +limit || 20, search);
            sendSuccess({ res, statusCode: 200, message: 'Claims fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const claim = await claimService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Claim found', data: claim });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

}

export const claimController = new ClaimController();
