import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const TRANSFER_IN = 'Transferência Recebida';
const TRANSFER_OUT = 'Transferência Enviada';

const accountSchema = z.object({
    name: z.string().min(1),
    type: z.string().optional(),
    initialBalance: z.number().finite().optional(),
    color: z.string().optional().nullable(),
});

const transferSchema = z.object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z.number().positive().finite(),
    date: z.string(),
    description: z.string().optional(),
});

// Calcula o saldo de cada conta a partir das transações pagas.
const computeBalances = async (userId: string): Promise<Record<string, number>> => {
    const txs = await prisma.transaction.findMany({
        where: { userId, isPaid: true, accountId: { not: null } },
        select: { accountId: true, type: true, amount: true, category: true },
    });
    const map: Record<string, number> = {};
    for (const t of txs) {
        if (!t.accountId) continue;
        let delta = 0;
        if (t.type === 'INCOME') delta = t.amount;
        else if (t.type === 'EXPENSE') delta = -t.amount;
        else if (t.type === 'TRANSFER') delta = t.category === TRANSFER_IN ? t.amount : -t.amount;
        map[t.accountId] = (map[t.accountId] || 0) + delta;
    }
    return map;
};

export const getAccounts = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const accounts = await prisma.account.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
        const balances = await computeBalances(userId);
        const result = accounts.map(a => ({ ...a, balance: a.initialBalance + (balances[a.id] || 0) }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar contas' });
    }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const result = accountSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados da conta inválidos', details: result.error.format() });
        }
        const d = result.data;
        const account = await prisma.account.create({
            data: {
                userId,
                name: d.name,
                type: d.type || 'CHECKING',
                initialBalance: d.initialBalance ?? 0,
                color: d.color ?? null,
            },
        });
        res.status(201).json({ ...account, balance: account.initialBalance });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.account.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

        const result = accountSchema.partial().extend({ archived: z.boolean().optional() }).safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados inválidos', details: result.error.format() });
        }
        const account = await prisma.account.update({ where: { id }, data: result.data });
        res.json(account);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar conta' });
    }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.account.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Conta não encontrada' });

        // Transações ficam com accountId null (onDelete: SetNull no schema)
        await prisma.account.delete({ where: { id } });
        res.json({ message: 'Conta removida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover conta' });
    }
};

// Transferência entre contas: cria um par atômico de transações (TRANSFER) compartilhando transferId.
export const transfer = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const result = transferSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados da transferência inválidos', details: result.error.format() });
        }
        const { fromAccountId, toAccountId, amount, date, description } = result.data;
        if (fromAccountId === toAccountId) {
            return res.status(400).json({ error: 'Conta de origem e destino devem ser diferentes' });
        }

        const [from, to] = await Promise.all([
            prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
            prisma.account.findFirst({ where: { id: toAccountId, userId } }),
        ]);
        if (!from || !to) return res.status(404).json({ error: 'Conta de origem ou destino não encontrada' });

        const when = new Date(date);
        const transferId = `tr_${userId.slice(0, 6)}_${when.getTime()}`;
        const baseDesc = description?.trim() || 'Transferência';

        await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    userId, accountId: fromAccountId, transferId,
                    description: `${baseDesc} → ${to.name}`, amount, type: 'TRANSFER',
                    category: TRANSFER_OUT, paymentMethod: 'OTHER', date: when, isPaid: true,
                },
            }),
            prisma.transaction.create({
                data: {
                    userId, accountId: toAccountId, transferId,
                    description: `${baseDesc} ← ${from.name}`, amount, type: 'TRANSFER',
                    category: TRANSFER_IN, paymentMethod: 'OTHER', date: when, isPaid: true,
                },
            }),
        ]);

        res.status(201).json({ message: 'Transferência realizada com sucesso', transferId });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao realizar transferência' });
    }
};
