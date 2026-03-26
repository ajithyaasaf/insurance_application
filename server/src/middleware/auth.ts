import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.cookies?.accessToken;

        if (!token) {
            sendError({ res, statusCode: 401, message: 'Authentication required' });
            return;
        }

        const decoded = verifyAccessToken(token);
        req.user = {
            userId: decoded.userId,
            role: decoded.role,
        };

        next();
    } catch (error) {
        sendError({ res, statusCode: 401, message: 'Invalid or expired token' });
    }
};
