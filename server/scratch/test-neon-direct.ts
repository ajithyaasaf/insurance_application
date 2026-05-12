
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Attempting to connect to NEON (DIRECT)...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('Neon Direct connection successful:', result);
  } catch (error) {
    console.error('Neon Direct connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
