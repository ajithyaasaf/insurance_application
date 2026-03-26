import dotenv from 'dotenv';
dotenv.config();

export const env = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'access-secret',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    NODE_ENV: process.env.NODE_ENV || 'development',
    CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
} as const;
