import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function runRestore() {
    const backupFilePath = process.argv[2];

    if (!backupFilePath) {
        console.error('❌ Error: Please provide the path to the backup JSON file.');
        console.error('💡 Example: npm run db:restore ../backups/db_backup_2026-06-20.json');
        process.exit(1);
    }

    const absolutePath = path.resolve(backupFilePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Error: Backup file not found at ${absolutePath}`);
        process.exit(1);
    }

    try {
        console.log(`🔄 Reading backup file from: ${absolutePath}...`);
        const fileContent = fs.readFileSync(absolutePath, 'utf-8');
        const backupData = JSON.parse(fileContent);

        if (!backupData.data || !backupData.schemaVersion) {
            console.error('❌ Error: Invalid backup file format.');
            process.exit(1);
        }

        const {
            users,
            companies,
            dealers,
            customers,
            policies,
            payments,
            claims,
            followUps,
            commissions
        } = backupData.data;

        console.log('⚠️  WARNING: This will overwrite existing database records.');
        console.log('🔄 Restoring database records...');

        await prisma.$transaction(async (tx) => {
            // 1. Delete existing records in correct reverse dependency order
            console.log('🧹 Clearing old database records...');
            await tx.commission.deleteMany();
            await tx.claim.deleteMany();
            await tx.followUp.deleteMany();
            await tx.payment.deleteMany();
            await tx.policy.deleteMany();
            await tx.customer.deleteMany();
            await tx.dealer.deleteMany();
            await tx.company.deleteMany();
            await tx.user.deleteMany();

            // 2. Restore records in correct dependency order
            console.log('📥 Restoring Users...');
            if (users?.length) await tx.user.createMany({ data: users });

            console.log('📥 Restoring Companies...');
            if (companies?.length) await tx.company.createMany({ data: companies });

            console.log('📥 Restoring Dealers...');
            if (dealers?.length) await tx.dealer.createMany({ data: dealers });

            console.log('📥 Restoring Customers...');
            if (customers?.length) {
                // Ensure correct date parsing
                const formattedCustomers = customers.map((c: any) => ({
                    ...c,
                    dob: c.dob ? new Date(c.dob) : null,
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt),
                    deletedAt: c.deletedAt ? new Date(c.deletedAt) : null,
                }));
                await tx.customer.createMany({ data: formattedCustomers });
            }

            console.log('📥 Restoring Policies...');
            if (policies?.length) {
                const formattedPolicies = policies.map((p: any) => ({
                    ...p,
                    startDate: new Date(p.startDate),
                    expiryDate: new Date(p.expiryDate),
                    registrationDate: p.registrationDate ? new Date(p.registrationDate) : null,
                    createdAt: new Date(p.createdAt),
                    updatedAt: new Date(p.updatedAt),
                    deletedAt: p.deletedAt ? new Date(p.deletedAt) : null,
                }));
                await tx.policy.createMany({ data: formattedPolicies });
            }

            console.log('📥 Restoring Payments...');
            if (payments?.length) {
                const formattedPayments = payments.map((p: any) => ({
                    ...p,
                    dueDate: new Date(p.dueDate),
                    paidAt: p.paidAt ? new Date(p.paidAt) : null,
                    createdAt: new Date(p.createdAt),
                    updatedAt: new Date(p.updatedAt),
                }));
                await tx.payment.createMany({ data: formattedPayments });
            }

            console.log('📥 Restoring Claims...');
            if (claims?.length) {
                const formattedClaims = claims.map((c: any) => ({
                    ...c,
                    claimDate: new Date(c.claimDate),
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt),
                }));
                await tx.claim.createMany({ data: formattedClaims });
            }

            console.log('📥 Restoring Follow Ups...');
            if (followUps?.length) {
                const formattedFollowUps = followUps.map((f: any) => ({
                    ...f,
                    nextFollowUpDate: new Date(f.nextFollowUpDate),
                    createdAt: new Date(f.createdAt),
                }));
                await tx.followUp.createMany({ data: formattedFollowUps });
            }

            console.log('📥 Restoring Commissions...');
            if (commissions?.length) {
                const formattedCommissions = commissions.map((c: any) => ({
                    ...c,
                    createdAt: new Date(c.createdAt),
                    updatedAt: new Date(c.updatedAt),
                }));
                await tx.commission.createMany({ data: formattedCommissions });
            }
        });

        console.log(`\n========================================`);
        console.log(`🎉 DATABASE RESTORED SUCCESSFULLY!`);
        console.log(`========================================\n`);

    } catch (err) {
        console.error('❌ Restore failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

runRestore();
