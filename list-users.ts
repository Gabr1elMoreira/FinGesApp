import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function list() {
    const users = await prisma.user.findMany();
    console.table(users, ['id', 'name', 'email']);
    await prisma.$disconnect();
}
list();