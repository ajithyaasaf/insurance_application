
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true }
    });
    console.log('Users in Neon DB:', users);
  } catch (error) {
    console.error('Error fetching users from Neon:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
