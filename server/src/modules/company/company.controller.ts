import { Request, Response, NextFunction } from 'express';
import { companyService } from './company.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class CompanyController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await companyService.create(req.body);
            sendSuccess({ res, statusCode: 201, message: 'Company created', data: company });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async findAll(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await companyService.findAll(req.query.search as string);
            sendSuccess({ res, statusCode: 200, message: 'Companies fetched', data });
        } catch (e: any) { next(e); }
    }

    async findById(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await companyService.findById(req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Company found', data: company });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const company = await companyService.update(req.params.id as string, req.body);
            sendSuccess({ res, statusCode: 200, message: 'Company updated', data: company });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await companyService.delete(req.params.id as string);
            sendSuccess({ res, statusCode: 200, message: 'Company deleted' });
        } catch (e: any) { e.statusCode ? sendError({ res, statusCode: e.statusCode, message: e.message }) : next(e); }
    }
}

export const companyController = new CompanyController();
