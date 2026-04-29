import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        let token = req.cookies?.accessToken;

        // Fallback to Authorization header if cookie is missing
        if (!token && req.headers.authorization?.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }

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
