import { Response } from 'express';

interface ApiResponseOptions {
    res: Response;
    statusCode: number;
    message: string;
    data?: unknown;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
    };
}

export const sendSuccess = ({
    res,
    statusCode = 200,
    message,
    data,
    meta,
}: ApiResponseOptions) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta,
    });
};

export const sendError = ({
    res,
    statusCode = 500,
    message,
}: Omit<ApiResponseOptions, 'data' | 'meta'>) => {
    return res.status(statusCode).json({
        success: false,
        message,
    });
};
