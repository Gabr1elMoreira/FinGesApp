import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3
    });
    console.log(transactions);
}
main();
