import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    const toDelete = [
        'ICICI Prudential',
        'SBI Life',
        'Max Life Insurance',
        'HDFC Life',
        'Kotak Life Insurance'
    ];
    
    const res = await prisma.company.deleteMany({
        where: { name: { in: toDelete } }
    });
    console.log(`Deleted ${res.count} unbound companies`);
}

cleanup().finally(() => prisma.$disconnect());
