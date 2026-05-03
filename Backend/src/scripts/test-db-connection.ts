import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Tentando conectar ao banco de dados...');
        await prisma.$connect();
        console.log('✅ Conexão bem-sucedida!');
        const userCount = await prisma.user.count();
        console.log(`📊 Total de usuários no banco: ${userCount}`);
    } catch (e: any) {
        console.error('❌ Erro de conexão com o banco de dados:');
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
