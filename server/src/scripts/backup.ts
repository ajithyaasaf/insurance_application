import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runBackup() {
    try {
        console.log('🔄 Starting database backup...');
        
        const [
            users,
            companies,
            customers,
            policies,
            payments,
            claims,
            followUps,
            commissions,
            dealers
        ] = await Promise.all([
            prisma.user.findMany(),
            prisma.company.findMany(),
            prisma.customer.findMany(),
            prisma.policy.findMany(),
            prisma.payment.findMany(),
            prisma.claim.findMany(),
            prisma.followUp.findMany(),
            prisma.commission.findMany(),
            prisma.dealer.findMany()
        ]);

        const backupData = {
            backedUpAt: new Date().toISOString(),
            schemaVersion: '1.0.0',
            data: {
                users,
                companies,
                customers,
                policies,
                payments,
                claims,
                followUps,
                commissions,
                dealers
            }
        };

        // Create backups directory in the root if it doesn't exist
        const rootDir = path.resolve(__dirname, '../../..');
        const backupsDir = path.join(rootDir, 'backups');
        if (!fs.existsSync(backupsDir)) {
            fs.mkdirSync(backupsDir, { recursive: true });
        }

        const dateStr = new Date().toISOString().split('T')[0];
        const backupFileName = `db_backup_${dateStr}.json`;
        const backupFilePath = path.join(backupsDir, backupFileName);

        fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
        
        console.log(`\n========================================`);
        console.log(`✅ DATABASE BACKUP SUCCESSFUL!`);
        console.log(`📂 Location: ${backupFilePath}`);
        console.log(`📊 Records backed up:`);
        console.log(`   - Users: ${users.length}`);
        console.log(`   - Companies: ${companies.length}`);
        console.log(`   - Customers: ${customers.length}`);
        console.log(`   - Policies: ${policies.length}`);
        console.log(`   - Payments: ${payments.length}`);
        console.log(`   - Claims: ${claims.length}`);
        console.log(`   - Follow Ups: ${followUps.length}`);
        console.log(`   - Commissions: ${commissions.length}`);
        console.log(`   - Dealers: ${dealers.length}`);
        console.log(`========================================\n`);
    } catch (err) {
        console.error('❌ Backup failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

runBackup();
