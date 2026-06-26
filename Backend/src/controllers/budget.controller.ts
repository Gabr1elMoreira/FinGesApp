import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const budgetSchema = z.object({
    category: z.string().min(1),
    amount: z.number().positive().finite(),
    month: z.number().int().min(0).max(11),
    year: z.number().int().min(2000).max(2100),
});

// Lista orçamentos (opcionalmente filtrados por mês/ano via query)
export const getBudgets = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const where: any = { userId };
        if (req.query.month !== undefined) where.month = Number(req.query.month);
        if (req.query.year !== undefined) where.year = Number(req.query.year);

        const budgets = await prisma.budget.findMany({ where, orderBy: { category: 'asc' } });
        res.json(budgets);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar orçamentos' });
    }
};

// Cria ou atualiza o orçamento de uma categoria no mês (upsert)
export const upsertBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const result = budgetSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados do orçamento inválidos', details: result.error.format() });
        }
        const { category, amount, month, year } = result.data;

        const budget = await prisma.budget.upsert({
            where: { userId_category_month_year: { userId, category, month, year } },
            update: { amount },
            create: { userId, category, amount, month, year },
        });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar orçamento' });
    }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.budget.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Orçamento não encontrado' });

        await prisma.budget.delete({ where: { id } });
        res.json({ message: 'Orçamento removido' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover orçamento' });
    }
};
