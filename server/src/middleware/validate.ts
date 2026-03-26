import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';

export const validate = (schema: AnyZodObject) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const message = error.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join(', ');
                sendError({ res, statusCode: 400, message });
                return;
            }
            next(error);
        }
    };
};
