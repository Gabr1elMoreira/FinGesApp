import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { Role } from '@prisma/client';
import { emitAuditLog, broadcastMessage } from '../services/socket.service';
import { getCache, setCache, invalidateCache, isRedisConnected } from '../services/redis.service';
import { generateAdminInsights } from '../services/ai.service';
import { hashPassword } from '../utils/auth';
import { AuthRequest } from '../middleware/auth';
import { isEmailConfigured, sendEmail, buildEmailHtml } from '../services/email.service';

// Resolve o nome do admin autenticado para registrar nos logs de auditoria
const getActorName = async (req: AuthRequest): Promise<string> => {
    try {
        if (!req.user) return 'Admin';
        const admin = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { name: true } });
        return admin?.name || 'Admin';
    } catch {
        return 'Admin';
    }
};

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

// Histórico real de auditoria persistido no banco
export const getAuditLogs = async (req: Request, res: Response) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 25,
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar logs de auditoria' });
    }
};

// Analytics reais da plataforma (séries temporais + distribuições)
export const getAnalytics = async (req: Request, res: Response) => {
    try {
        const cacheKey = 'admin_analytics';
        const cached = await getCache(cacheKey);
        if (cached) return res.json(cached);

        const now = new Date();
        const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        const months: { year: number; month: number; label: string }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
            months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), label: MONTH_LABELS[d.getUTCMonth()] });
        }

        const [users, transactions, reportsCount, broadcastsCount] = await Promise.all([
            prisma.user.findMany({ select: { createdAt: true, role: true, lastLoginAt: true } }),
            prisma.transaction.findMany({ select: { createdAt: true, type: true, category: true, paymentMethod: true, amount: true, isPaid: true, isRecurrent: true } }),
            prisma.monthlyReport.count(),
            prisma.systemBroadcast.count(),
        ]);

        const inBucket = (createdAt: Date, b: { year: number; month: number }) =>
            createdAt.getUTCFullYear() === b.year && createdAt.getUTCMonth() === b.month;

        const userGrowth = months.map(b => ({ label: b.label, count: users.filter(u => inBucket(u.createdAt, b)).length }));
        const txGrowth = months.map(b => ({ label: b.label, count: transactions.filter(t => inBucket(t.createdAt, b)).length }));

        const pct = (curr: number, prev: number) =>
            prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

        const userGrowthPct = pct(userGrowth[userGrowth.length - 1].count, userGrowth[userGrowth.length - 2]?.count || 0);
        const txGrowthPct = pct(txGrowth[txGrowth.length - 1].count, txGrowth[txGrowth.length - 2]?.count || 0);

        const catMap: Record<string, number> = {};
        transactions.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
        const categoryDistribution = Object.entries(catMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 6);

        const pmMap: Record<string, number> = {};
        transactions.forEach(t => { pmMap[t.paymentMethod] = (pmMap[t.paymentMethod] || 0) + 1; });
        const paymentMethods = Object.entries(pmMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

        const paidCount = transactions.filter(t => t.isPaid).length;
        const pendingCount = transactions.length - paidCount;
        const recurringCount = transactions.filter(t => t.isRecurrent).length;
        const totalVolume = transactions.reduce((s, t) => s + (t.amount || 0), 0);

        const admins = users.filter(u => u.role === 'ADMIN').length;
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= oneDayAgo).length;

        // Retenção: ativos nos últimos 30 dias vs. inativos (churn)
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const active30 = users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= thirtyDaysAgo).length;
        const churn30 = users.length - active30;
        const newThisMonth = userGrowth[userGrowth.length - 1].count;

        // Ranking dos usuários com mais transações
        const topUsersRaw = await prisma.user.findMany({
            select: { id: true, name: true, email: true, lastLoginAt: true, _count: { select: { transactions: true } } },
            orderBy: { transactions: { _count: 'desc' } },
            take: 5,
        });
        const topUsers = topUsersRaw.map(u => ({ id: u.id, name: u.name, email: u.email, transactions: u._count.transactions }));

        const result = {
            userGrowth, txGrowth, userGrowthPct, txGrowthPct,
            categoryDistribution, paymentMethods,
            paidCount, pendingCount, recurringCount, totalVolume,
            roleBreakdown: { admins, users: users.length - admins },
            activeUsers,
            retention: { active30, churn30, newThisMonth, retentionRate: users.length > 0 ? Math.round((active30 / users.length) * 100) : 0 },
            topUsers,
            dbCounts: { users: users.length, transactions: transactions.length, reports: reportsCount, broadcasts: broadcastsCount },
        };

        await setCache(cacheKey, result, 300);
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar analytics' });
    }
};

// Limpa caches conhecidos do sistema (real)
export const clearCache = async (req: Request, res: Response) => {
    try {
        await invalidateCache('admin_stats');
        await invalidateCache('admin_analytics');
        await emitAuditLog('Cache do sistema limpo pelo administrador', 'info');
        res.json({ message: 'Cache limpo com sucesso', clearedKeys: ['admin_stats', 'admin_analytics'] });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao limpar cache' });
    }
};

// Exporta backup completo do banco (sem senhas)
export const exportDatabase = async (req: Request, res: Response) => {
    try {
        const [users, transactions, reports] = await Promise.all([
            prisma.user.findMany({
                select: { id: true, name: true, email: true, role: true, theme: true, enabledCategories: true, lastLoginAt: true, createdAt: true },
            }),
            prisma.transaction.findMany(),
            prisma.monthlyReport.findMany(),
        ]);
        await emitAuditLog('Backup completo do banco de dados exportado', 'success');
        res.json({
            exportedAt: new Date().toISOString(),
            counts: { users: users.length, transactions: transactions.length, reports: reports.length },
            users, transactions, reports,
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao exportar banco de dados' });
    }
};

// Verificação real de integridade dos dados
export const runIntegrityCheck = async (req: Request, res: Response) => {
    try {
        const [users, transactions] = await Promise.all([
            prisma.user.findMany({ select: { id: true, email: true } }),
            prisma.transaction.findMany({ select: { id: true, userId: true, amount: true } }),
        ]);

        const userIds = new Set(users.map(u => u.id));
        const orphanTransactions = transactions.filter(t => !userIds.has(t.userId)).length;

        const emailCount: Record<string, number> = {};
        users.forEach(u => { const e = u.email.toLowerCase(); emailCount[e] = (emailCount[e] || 0) + 1; });
        const duplicateEmails = Object.values(emailCount).filter(c => c > 1).length;

        const negativeAmounts = transactions.filter(t => t.amount < 0).length;
        const zeroAmounts = transactions.filter(t => t.amount === 0).length;

        const checks = [
            { label: 'Transações órfãs (sem usuário)', value: orphanTransactions, ok: orphanTransactions === 0 },
            { label: 'E-mails duplicados', value: duplicateEmails, ok: duplicateEmails === 0 },
            { label: 'Valores negativos', value: negativeAmounts, ok: negativeAmounts === 0 },
            { label: 'Transações com valor zero', value: zeroAmounts, ok: zeroAmounts === 0 },
        ];
        const issues = checks.filter(c => !c.ok).length;

        await emitAuditLog(`Verificação de integridade: ${issues} problema(s) encontrado(s)`, issues > 0 ? 'warning' : 'success');
        res.json({
            checkedAt: new Date().toISOString(),
            issues,
            checks,
            totals: { users: users.length, transactions: transactions.length },
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro na verificação de integridade' });
    }
};

// ===== GESTÃO DE USUÁRIOS =====

// Detalhes completos de um usuário (perfil + estatísticas financeiras)
export const getUserDetails = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, role: true, avatar: true, theme: true, enabledCategories: true, lastLoginAt: true, createdAt: true },
        });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const txs = await prisma.transaction.findMany({
            where: { userId: id },
            orderBy: { date: 'desc' },
        });

        const income = txs.filter(t => t.type === 'INCOME' && t.isPaid).reduce((s, t) => s + t.amount, 0);
        const expense = txs.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((s, t) => s + t.amount, 0);
        const pending = txs.filter(t => !t.isPaid).length;
        const recurring = txs.filter(t => t.isRecurrent).length;

        const catMap: Record<string, number> = {};
        txs.filter(t => t.type === 'EXPENSE').forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
        const topCategories = Object.entries(catMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5);

        const reportsCount = await prisma.monthlyReport.count({ where: { userId: id } });

        res.json({
            user,
            stats: { totalTransactions: txs.length, income, expense, balance: income - expense, pending, recurring, reportsCount },
            topCategories,
            recentTransactions: txs.slice(0, 10),
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar detalhes do usuário' });
    }
};

// Edita nome / e-mail / role de um usuário
export const updateUser = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, email, role } = req.body;
    try {
        const data: { name?: string; email?: string; role?: Role } = {};
        if (typeof name === 'string' && name.trim()) data.name = name.trim();
        if (typeof email === 'string' && email.trim()) data.email = email.trim().toLowerCase();
        if (role === 'ADMIN' || role === 'USER') data.role = role as Role;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Nenhum dado válido para atualizar' });
        }

        if (data.email) {
            const existing = await prisma.user.findUnique({ where: { email: data.email } });
            if (existing && existing.id !== id) {
                return res.status(400).json({ error: 'E-mail já está em uso por outro usuário' });
            }
        }

        const updated = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, name: true, email: true, role: true },
        });

        const actor = await getActorName(req);
        await emitAuditLog(`${actor} editou o usuário ${updated.name}`, 'info');
        await invalidateCache('admin_analytics');
        res.json(updated);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
};

// Redefine a senha de um usuário e devolve uma senha temporária (mostrada uma única vez)
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

        const tempPassword = `Fin@${Math.random().toString(36).slice(2, 8)}${Math.floor(10 + Math.random() * 89)}`;
        const hashed = await hashPassword(tempPassword);
        await prisma.user.update({ where: { id }, data: { password: hashed } });

        const actor = await getActorName(req);
        await emitAuditLog(`${actor} redefiniu a senha de ${user.name}`, 'warning');
        res.json({ tempPassword, message: 'Senha redefinida com sucesso. Compartilhe a senha temporária com o usuário.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
};

// ===== OPERAÇÕES & SAÚDE =====

// Health-check real: banco, cache, uptime, versão
export const getHealth = async (req: Request, res: Response) => {
    const result: any = {
        timestamp: new Date().toISOString(),
        uptimeSec: Math.floor(process.uptime()),
        node: process.version,
    };

    try {
        const t0 = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        result.database = { status: 'online', latencyMs: Date.now() - t0 };
    } catch {
        result.database = { status: 'offline', latencyMs: null };
    }

    result.cache = { status: isRedisConnected() ? 'online' : 'offline' };

    res.json(result);
};

// Histórico de comunicados enviados
export const getBroadcasts = async (req: Request, res: Response) => {
    try {
        const list = await prisma.systemBroadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar comunicados' });
    }
};

// Envia e-mail (comunicado/atualização/chamada) para 1 usuário ou um segmento.
// body: { target: 'user'|'all'|'active'|'inactive', userId?, subject, message }
export const sendUserEmail = async (req: AuthRequest, res: Response) => {
    try {
        const { target, userId, subject, message } = req.body;
        if (!subject || !message || typeof subject !== 'string' || typeof message !== 'string') {
            return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios' });
        }
        if (!isEmailConfigured()) {
            return res.status(503).json({ error: 'Envio de e-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM no backend.' });
        }

        let recipients: { email: string; name: string }[] = [];
        if (target === 'user') {
            if (!userId) return res.status(400).json({ error: 'userId é obrigatório para envio individual' });
            const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
            if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
            recipients = [u];
        } else {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            let where: any = {};
            if (target === 'active') where = { lastLoginAt: { gte: thirtyDaysAgo } };
            else if (target === 'inactive') where = { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: thirtyDaysAgo } }] };
            recipients = await prisma.user.findMany({ where, select: { email: true, name: true } });
        }

        if (recipients.length === 0) {
            return res.status(400).json({ error: 'Nenhum destinatário encontrado para este segmento' });
        }

        const MAX = 300;
        const capped = recipients.slice(0, MAX);
        const results = await Promise.allSettled(
            capped.map(r => sendEmail(r.email, subject, buildEmailHtml(subject, message, r.name)))
        );
        const sent = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.length - sent;

        await emitAuditLog(`Admin enviou e-mail "${subject.slice(0, 40)}" para ${sent} usuário(s)`, failed > 0 ? 'warning' : 'info');
        res.json({ sent, failed, total: recipients.length, capped: recipients.length > capped.length });
    } catch (error: any) {
        console.error('SEND EMAIL ERROR:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail: ' + (error?.message || 'desconhecido') });
    }
};

// Indica se o envio de e-mail está configurado no servidor
export const getEmailStatus = async (_req: AuthRequest, res: Response) => {
    res.json({ configured: isEmailConfigured() });
};

// Revoga (desativa) um comunicado
export const revokeBroadcast = async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    try {
        const updated = await prisma.systemBroadcast.update({ where: { id }, data: { active: false } });
        const actor = await getActorName(req);
        await emitAuditLog(`${actor} revogou um comunicado do sistema`, 'info');
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao revogar comunicado' });
    }
};
