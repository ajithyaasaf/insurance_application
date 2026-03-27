import { Request, Response, NextFunction } from 'express';
import { leadService } from './lead.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class LeadController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const lead = await leadService.create(
                req.user!.userId,
                req.user!.role,
                req.body
            );
            sendSuccess({ res, statusCode: 201, message: 'Lead created', data: lead });
        } catch (error: any) {
            error.statusCode
                ? sendError({ res, statusCode: error.statusCode, message: error.message })
                : next(error);
        }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;
            const search = req.query.search as string | undefined;
            const status = req.query.status as string | undefined;

            const result = await leadService.findAll(
                req.user!.userId,
                page,
                limit,
                search,
                status
            );

            sendSuccess({
                res,
                statusCode: 200,
                message: 'Leads fetched',
                data: result.data,
                meta: result.meta,
            });
        } catch (error: any) {
            next(error);
        }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const lead = await leadService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Lead found', data: lead });
        } catch (error: any) {
            error.statusCode
                ? sendError({ res, statusCode: error.statusCode, message: error.message })
                : next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const lead = await leadService.update(
                req.user!.userId,
                req.user!.role,
                req.params.id as string,
                req.body
            );
            sendSuccess({ res, statusCode: 200, message: 'Lead updated', data: lead });
        } catch (error: any) {
            error.statusCode
                ? sendError({ res, statusCode: error.statusCode, message: error.message })
                : next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await leadService.softDelete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Lead deleted' });
        } catch (error: any) {
            error.statusCode
                ? sendError({ res, statusCode: error.statusCode, message: error.message })
                : next(error);
        }
    }

    async convert(req: Request, res: Response, next: NextFunction) {
        try {
            const customer = await leadService.convertToCustomer(
                req.user!.userId,
                req.user!.role,
                req.params.id as string,
                req.body
            );
            sendSuccess({
                res,
                statusCode: 201,
                message: 'Lead converted to customer',
                data: customer,
            });
        } catch (error: any) {
            error.statusCode
                ? sendError({ res, statusCode: error.statusCode, message: error.message })
                : next(error);
        }
    }
}

export const leadController = new LeadController();
