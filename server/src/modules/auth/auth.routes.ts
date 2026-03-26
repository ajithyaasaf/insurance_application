import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema } from './auth.schema';
import { authenticate } from '../../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { status: 'error', message: 'Too many login attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/register', authLimiter, validate(registerSchema), (req, res, next) =>
    authController.register(req, res, next)
);
router.post('/login', authLimiter, validate(loginSchema), (req, res, next) =>
    authController.login(req, res, next)
);
router.post('/refresh', (req, res, next) =>
    authController.refresh(req, res, next)
);
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res, next) =>
    authController.me(req, res, next)
);

export default router;
