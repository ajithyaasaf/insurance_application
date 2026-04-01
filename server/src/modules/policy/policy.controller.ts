import { Request, Response, NextFunction } from 'express';
import { policyService } from './policy.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class PolicyController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const policy = await policyService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Policy created', data: policy });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search, status, policyType, companyId } = req.query as any;
            const result = await policyService.findAll(req.user!.userId, +page || 1, +limit || 20, search, status, policyType, companyId);
            sendSuccess({ res, statusCode: 200, message: 'Policies fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const policy = await policyService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Policy found', data: policy });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const policy = await policyService.update(req.user!.userId, req.user!.role, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Policy updated', data: policy });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await policyService.softDelete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Policy deleted' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async preDeleteCheck(req: Request, res: Response, next: NextFunction) {
        try {
            const counts = await policyService.preDeleteCheck(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Pre-delete check complete', data: counts });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async renew(req: Request, res: Response, next: NextFunction) {
        try {
            const policy = await policyService.renew(req.user!.userId, req.user!.role, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 201, message: 'Policy renewed', data: policy });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }
}

export const policyController = new PolicyController();
