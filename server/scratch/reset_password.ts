import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash('password123', 12);
    const email = 'admin@gmail.com';

    const user = await prisma.user.update({
        where: { email },
        data: { passwordHash }
    });

    console.log(`Updated password for ${email} to 'password123'`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
