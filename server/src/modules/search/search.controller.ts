import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export class SearchController {
    async globalSearch(req: Request, res: Response, next: NextFunction) {
        try {
            const { q } = req.query;
            const results = await searchService.globalSearch(req.user!.userId, q as string);
            sendSuccess({ res, statusCode: 200, message: 'Search results fetched', data: results });
        } catch (e: any) {
            next(e);
        }
    }
}

export const searchController = new SearchController();
