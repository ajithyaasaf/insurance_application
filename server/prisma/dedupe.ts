import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dedupe() {
    console.log('Starting deduplication of companies...');
    const allCompanies = await prisma.company.findMany();
    
    // Group by name
    const grouped = allCompanies.reduce((acc, company) => {
        if (!acc[company.name]) acc[company.name] = [];
        acc[company.name].push(company);
        return acc;
    }, {} as Record<string, any[]>);

    let deletedCount = 0;
    let updatedPoliciesCount = 0;

    for (const [name, duplicates] of Object.entries(grouped)) {
        if (duplicates.length > 1) {
            console.log(`Found ${duplicates.length} for ${name}`);
            // Keep the first one 
            const kept = duplicates[0];
            const toDelete = duplicates.slice(1);

            for (const dup of toDelete) {
                // Check if any policies use this duplicate ID
                const policies = await prisma.policy.findMany({ where: { companyId: dup.id } });
                if (policies.length > 0) {
                    // Reassign them to the kept company
                    const res = await prisma.policy.updateMany({
                        where: { companyId: dup.id },
                        data: { companyId: kept.id }
                    });
                    updatedPoliciesCount += res.count;
                }
                
                // Now safely delete the duplicate
                await prisma.company.delete({ where: { id: dup.id } });
                deletedCount++;
            }
        }
    }

    console.log(`Deduplication complete. Deleted ${deletedCount} duplicate companies and updated ${updatedPoliciesCount} orphaned policies.`);
}

dedupe()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
