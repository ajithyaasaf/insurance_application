import { Request, Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class CustomerController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await customerService.create(req.user!.userId, req.user!.role, req.body);
            sendSuccess({
                res,
                statusCode: 201,
                message: result.warning ? `Customer created. Warning: ${result.warning}` : 'Customer created',
                data: result.customer,
            });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, limit, search } = req.query as any;
            const result = await customerService.findAll(req.user!.userId, +page || 1, +limit || 20, search);
            sendSuccess({ res, statusCode: 200, message: 'Customers fetched', data: result.data, meta: result.meta });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const customer = await customerService.findById(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Customer found', data: customer });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const customer = await customerService.update(req.user!.userId, req.user!.role, req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Customer updated', data: customer });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await customerService.softDelete(req.user!.userId, req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Customer deleted' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }
}

export const customerController = new CustomerController();
