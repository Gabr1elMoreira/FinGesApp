import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const goalSchema = z.object({
    description: z.string().min(1),
    targetAmount: z.number().positive().finite(),
    currentAmount: z.number().finite().optional(),
    type: z.enum(['SPENDING_LIMIT', 'SAVINGS_TARGET']),
    category: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
});

const contributionSchema = z.object({
    amount: z.number().positive().finite(),
    date: z.string(),
    note: z.string().optional().nullable(),
});

// Lista as metas do usuário (com aportes)
export const getGoals = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const goals = await prisma.goal.findMany({
            where: { userId },
            include: { contributions: { orderBy: { date: 'desc' } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar metas' });
    }
};

// Cria uma nova meta
export const createGoal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const result = goalSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados da meta inválidos', details: result.error.format() });
        }
        const d = result.data;
        const goal = await prisma.goal.create({
            data: {
                userId,
                description: d.description,
                targetAmount: d.targetAmount,
                currentAmount: d.currentAmount ?? 0,
                type: d.type,
                category: d.category ?? null,
                deadline: d.deadline ? new Date(d.deadline) : null,
            },
            include: { contributions: true },
        });
        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar meta' });
    }
};

// Atualiza uma meta existente (apenas do próprio usuário)
export const updateGoal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.goal.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Meta não encontrada' });

        const result = goalSchema.partial().safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados da meta inválidos', details: result.error.format() });
        }
        const d = result.data;
        const data: any = {};
        if (d.description !== undefined) data.description = d.description;
        if (d.targetAmount !== undefined) data.targetAmount = d.targetAmount;
        if (d.currentAmount !== undefined) data.currentAmount = d.currentAmount;
        if (d.type !== undefined) data.type = d.type;
        if (d.category !== undefined) data.category = d.category;
        if (d.deadline !== undefined) data.deadline = d.deadline ? new Date(d.deadline) : null;

        const goal = await prisma.goal.update({
            where: { id },
            data,
            include: { contributions: { orderBy: { date: 'desc' } } },
        });
        res.json(goal);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar meta' });
    }
};

// Exclui uma meta (aportes caem em cascata)
export const deleteGoal = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.goal.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Meta não encontrada' });

        await prisma.goal.delete({ where: { id } });
        res.json({ message: 'Meta excluída com sucesso' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao excluir meta' });
    }
};

// Adiciona um aporte a uma meta de poupança e atualiza o total
export const addContribution = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const existing = await prisma.goal.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'Meta não encontrada' });

        const result = contributionSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Dados do aporte inválidos', details: result.error.format() });
        }
        const d = result.data;

        const [, goal] = await prisma.$transaction([
            prisma.contribution.create({
                data: { goalId: id, amount: d.amount, date: new Date(d.date), note: d.note ?? null },
            }),
            prisma.goal.update({
                where: { id },
                data: { currentAmount: { increment: d.amount } },
                include: { contributions: { orderBy: { date: 'desc' } } },
            }),
        ]);

        res.status(201).json(goal);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao adicionar aporte' });
    }
};
