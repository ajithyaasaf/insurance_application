import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const policies = await prisma.policy.findMany({
        take: 5,
        include: {
            customer: true
        }
    });
    console.log(JSON.stringify(policies.map(p => ({
        id: p.id,
        policyNumber: p.policyNumber,
        customerId: p.customerId,
        customerName: p.customer?.name
    })), null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
