import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        include: { user: true }
    });

    console.table(transactions.map(t => ({
        user: t.user.email,
        date: new Date(t.date).toISOString().split('T')[0],
        amount: t.amount,
        type: t.type
    })));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
