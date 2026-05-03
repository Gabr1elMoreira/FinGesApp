import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: {
            _count: {
                select: { transactions: true }
            }
        }
    });

    if (users.length === 0) {
        console.log('Nenhum usuário encontrado.');
    } else {
        console.table(users.map(u => ({
            name: u.name,
            email: u.email,
            transactions: u._count.transactions
        })));
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
