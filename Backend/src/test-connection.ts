import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    console.log('Testing database connection...');
    console.log(`URL: ${process.env.DATABASE_URL}`);
    try {
        await prisma.$connect();
        console.log('Successfully connected to the database!');
        const userCount = await prisma.user.count();
        console.log(`Found ${userCount} users.`);
    } catch (e) {
        console.error('Connection failed!');
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
