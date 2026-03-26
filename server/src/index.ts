import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import leadRoutes from './modules/lead/lead.routes';
import customerRoutes from './modules/customer/customer.routes';
import companyRoutes from './modules/company/company.routes';
import policyRoutes from './modules/policy/policy.routes';
import paymentRoutes from './modules/payment/payment.routes';
import claimRoutes from './modules/claim/claim.routes';
import followUpRoutes from './modules/followup/followup.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';

const app = express();

// ─── Middleware ──────────────────────────────────────────
app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

// ─── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
});

export default app;
