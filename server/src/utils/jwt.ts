import jwt from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
    userId: string;
    role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
        expiresIn: env.ACCESS_TOKEN_EXPIRY,
    });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
        expiresIn: env.REFRESH_TOKEN_EXPIRY,
    });
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};
