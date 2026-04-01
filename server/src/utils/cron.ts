import cron from 'node-cron';
import { policyService } from '../modules/policy/policy.service';

export const initCronJobs = () => {
    // STARTUP SWEEP: Catch any missed expirations while the server was offline
    console.log('[CRON/STARTUP] Running startup expiration sweep...');
    policyService.autoExpirePolicies()
        .then(count => {
            if (count > 0) console.log(`[STARTUP] Successfully hard-expired ${count} policies.`);
        })
        .catch(err => console.error('[STARTUP] Error during sweep:', err));

    // SCHEDULED SWEEP: Run every day at exactly midnight server time (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting midnight policy expiration sweep...');
        try {
            const expiredCount = await policyService.autoExpirePolicies();
            if (expiredCount > 0) console.log(`[CRON] Successfully marked ${expiredCount} policies as expired.`);
        } catch (error) {
            console.error('[CRON] Error during policy expiration sweep:', error);
        }
    });
    
    console.log('Cron jobs initialized.');
};
