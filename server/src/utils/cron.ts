import cron from 'node-cron';
import { policyService } from '../modules/policy/policy.service';

export const initCronJobs = () => {
    // Run every day at exactly midnight server time (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting midnight policy expiration sweep...');
        try {
            const expiredCount = await policyService.autoExpirePolicies();
            console.log(`[CRON] Successfully marked ${expiredCount} policies as expired.`);
        } catch (error) {
            console.error('[CRON] Error during policy expiration sweep:', error);
        }
    });
    
    console.log('Cron jobs initialized.');
};
