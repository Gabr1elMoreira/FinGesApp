import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { Role } from '@prisma/client';
import { emitAuditLog, broadcastMessage } from '../services/socket.service';
import { getCache, setCache, invalidateCache } from '../services/redis.service';
import { generateAdminInsights } from '../services/ai.service';

export const getStats = async (req: Request, res: Response) => {
    try {
        const cacheKey = 'admin_stats';
        const cachedData = await getCache(cacheKey);
        if (cachedData) return res.json(cachedData);

        const totalUsers = await prisma.user.count();

        // Users logged in the last 24 hours
        const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = await prisma.user.count({
            where: {
                lastLoginAt: {
                    gte: oneDayAgo
                }
            }
        });

        const totalTransactions = await prisma.transaction.count();

        const stats = {
            totalUsers,
            activeUsers,
            totalTransactions
        };

        await setCache(cacheKey, stats, 300); // 5 min cache
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLoginAt: true,
                createdAt: true,
                _count: {
                    select: { transactions: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Use a transaction to delete user and their transactions safely
        await prisma.$transaction([
            prisma.transaction.deleteMany({
                where: { userId: id }
            }),
            prisma.user.delete({
                where: { id }
            })
        ]);

        res.json({ message: 'Usuário deletado com sucesso' });
        await emitAuditLog(`Usuário ID ${id.substring(0,8)}... removido permanentemente`, 'warning');
        await invalidateCache('admin_stats');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
};

export const getAdminAIInsights = async (req: Request, res: Response) => {
    try {
        const stats = await prisma.$transaction(async (tx) => {
            const totalUsers = await tx.user.count();
            const oneDayAgo = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
            const activeUsers = await tx.user.count({ where: { lastLoginAt: { gte: oneDayAgo } } });
            const totalTransactions = await tx.transaction.count();
            return { totalUsers, activeUsers, totalTransactions };
        });

        const insights = await generateAdminInsights(stats);
        res.json(insights);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao gerar insights de admin' });
    }
};

export const sendBroadcast = async (req: Request, res: Response) => {
    try {
        const { message, title } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });

        // O broadcastMessage agora já salva no banco (SystemBroadcast)
        await broadcastMessage(message, title || "COMUNICADO DO SISTEMA");
        await emitAuditLog(`Broadcast enviado: ${message.substring(0, 30)}...`, 'info');
        
        res.json({ message: 'Broadcast enviado e salvo com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao enviar broadcast' });
    }
};

export const getLatestBroadcast = async (req: Request, res: Response) => {
    try {
        const latest = await prisma.systemBroadcast.findFirst({
            where: { active: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(latest);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar broadcast' });
    }
};

export const toggleRole = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const newRole = user.role === Role.ADMIN ? Role.USER : Role.ADMIN;

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role: newRole }
        });

        res.json(updatedUser);
        await emitAuditLog(`Permissão de ${updatedUser.name} alterada para ${newRole}`, 'info');
    } catch (error: any) {
        console.error("Erro ao alterar role:", error);
        res.status(500).json({ error: `Erro ao alterar permissão: ${error.message}` });
    }
};
