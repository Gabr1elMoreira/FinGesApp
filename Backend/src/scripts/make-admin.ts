import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const email = process.argv[2];

if (!email) {
    console.error('Por favor, forneça um email como argumento.');
    console.log('Uso: npx ts-node src/scripts/make-admin.ts <email>');
    process.exit(1);
}

async function main() {
    console.log(`Buscando usuário com email: ${email}...`);

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        console.error(`Usuário com email ${email} não encontrado.`);
        process.exit(1);
    }

    if (user.role === Role.ADMIN) {
        console.log(`O usuário ${user.name} (${email}) já é um ADMIN.`);
        return;
    }

    await prisma.user.update({
        where: { email },
        data: { role: Role.ADMIN },
    });

    console.log(`✅ Sucesso! O usuário ${user.name} (${email}) agora é um ADMIN.`);
}

main()
    .catch((e) => {
        console.error('Erro ao promover usuário:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
