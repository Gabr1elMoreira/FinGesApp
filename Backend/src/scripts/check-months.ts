import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const transactions = await prisma.transaction.findMany({
        select: { date: true }
    });

    const months = transactions.map(t => {
        const d = new Date(t.date);
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    });

    const counts: Record<string, number> = {};
    months.forEach(m => counts[m] = (counts[m] || 0) + 1);

    console.log("Transações por mês:", counts);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
