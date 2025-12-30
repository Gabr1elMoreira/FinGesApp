import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const transactionSchema = z.object({
    description: z.string(),
    amount: z.number(),
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    category: z.string(),
    paymentMethod: z.string(),
    date: z.string(), // ISO Date string
    isPaid: z.boolean().optional(), // NOVO CAMPO
    isRecurrent: z.boolean().optional(),
    recurrenceFrequency: z.string().optional(),
});

// Helper to process recurrence
const processRecurrentTransactions = async (userId: string) => {
    const transactions = await prisma.transaction.findMany({
        where: { userId, isRecurrent: true },
    });

    const now = new Date();
    const newEntries = [];

    for (const t of transactions) {
        if (t.recurrenceFrequency === 'NONE') continue;

        const lastDate = new Date(t.date);
        let nextDate = new Date(lastDate);

        if (t.recurrenceFrequency === 'MONTHLY') {
            nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (t.recurrenceFrequency === 'WEEKLY') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else if (t.recurrenceFrequency === 'YEARLY') {
            nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        if (nextDate <= now) {
            const exists = await prisma.transaction.findFirst({
                where: {
                    userId,
                    description: t.description,
                    date: nextDate,
                },
            });

            if (!exists) {
                newEntries.push({
                    userId,
                    description: t.description,
                    amount: t.amount,
                    type: t.type,
                    category: t.category,
                    paymentMethod: t.paymentMethod,
                    date: nextDate,
                    isPaid: t.type === 'INCOME', // Se for Receita nasce paga, se for Despesa nasce pendente
                    isRecurrent: true,
                    recurrenceFrequency: t.recurrenceFrequency,
                });
            }
        }
    }

    if (newEntries.length > 0) {
        await prisma.transaction.createMany({ data: newEntries });
    }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        await processRecurrentTransactions(userId);

        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'FAILED TO FETCH TRANSACTIONS' });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const data = transactionSchema.parse(req.body);

        const transaction = await prisma.transaction.create({
            data: {
                ...data,
                userId,
                date: new Date(data.date),
                isPaid: data.isPaid ?? true, // Padrão true se não enviado
            },
        });

        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ error: 'INVALID DATA' });
    }
};


// Adicione este export junto aos outros no transaction.controller.ts
export const getPendingTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        const pending = await prisma.transaction.findMany({
            where: {
                userId,
                isPaid: false // Filtra apenas o que não foi pago
            },
            orderBy: { date: 'asc' }, // As mais próximas primeiro
        });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ error: 'Falha ao buscar contas pendentes' });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;
        const data = transactionSchema.partial().parse(req.body);

        const existing = await prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'TRANSACTION NOT FOUND' });

        const updated = await prisma.transaction.update({
            where: { id },
            data: {
                ...data,
                date: data.date ? new Date(data.date) : undefined,
                isPaid: data.isPaid,
            },
        });

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: 'UPDATE FAILED' });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { id } = req.params;

        const existing = await prisma.transaction.findFirst({ where: { id, userId } });
        if (!existing) return res.status(404).json({ error: 'TRANSACTION NOT FOUND' });

        await prisma.transaction.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'DELETE FAILED' });
    }
};

export const clearAllTransactions = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;

        await prisma.transaction.deleteMany({
            where: { userId }
        });

        res.status(204).send();
    } catch (error) {
        console.error("Clear All Error:", error);
        res.status(500).json({ error: 'FAILED TO CLEAR TRANSACTIONS' });
    }
};