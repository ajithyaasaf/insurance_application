import cron from 'node-cron';
import { policyService } from '../modules/policy/policy.service';
import { paymentService } from '../modules/payment/payment.service';
import prisma from './prisma';

export const initCronJobs = () => {
    // STARTUP SWEEP
    console.log('[CRON/STARTUP] Running startup sweeps...');
    
    // Policy Expirations
    policyService.autoExpirePolicies()
        .then(count => {
            if (count > 0) console.log(`[STARTUP] Successfully hard-expired ${count} policies.`);
        })
        .catch(err => console.error('[STARTUP] Policy sweep error:', err));

    // Payment Overdue Detection
    prisma.user.findMany({ select: { id: true } })
        .then(async (users) => {
            let totalOverdue = 0;
            for (const user of users) {
                const { updated } = await paymentService.detectOverdue(user.id);
                totalOverdue += updated;
            }
            if (totalOverdue > 0) console.log(`[STARTUP] Detected ${totalOverdue} overdue payments.`);
        })
        .catch(err => console.error('[STARTUP] Payment sweep error:', err));

    // SCHEDULED SWEEP: Run every day at exactly midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting midnight sweeps...');
        try {
            // 1. Policy expiration
            const expiredPoliciesCount = await policyService.autoExpirePolicies();
            if (expiredPoliciesCount > 0) {
                console.log(`[CRON] Mark ${expiredPoliciesCount} policies as expired.`);
            }

            // 2. Payment overdue detection (for all users)
            const users = await prisma.user.findMany({ select: { id: true } });
            let totalOverdue = 0;
            for (const user of users) {
                const { updated } = await paymentService.detectOverdue(user.id);
                totalOverdue += updated;
            }
            if (totalOverdue > 0) {
                console.log(`[CRON] Mark ${totalOverdue} payments as overdue.`);
            }

        } catch (error) {
            console.error('[CRON] Error during midnight sweeps:', error);
        }
    });
    
    console.log('Cron jobs initialized.');
};
