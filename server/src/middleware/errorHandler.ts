import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse';

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Unhandled Error:', err);

    const statusCode = (err as any).statusCode || 500;
    const message =
        process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error';

    sendError({ res, statusCode, message });
};
