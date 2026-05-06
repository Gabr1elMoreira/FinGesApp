import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { generateMonthlyAnalysis } from '../services/ai.service';
import { ReportVerdict } from '@prisma/client';

export const getMonthlyReport = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
        const userId = req.user.userId;

        const now = new Date();
        const currentMonth = now.getUTCMonth() + 1;
        const currentYear = now.getUTCFullYear();

        const month = req.query.month ? parseInt(req.query.month as string) : currentMonth;
        const year = req.query.year ? parseInt(req.query.year as string) : currentYear;

        const isCurrentMonth = (month === currentMonth && year === currentYear);

        console.log(`[Advisor] Solicitado: ${month}/${year}. (Hoje: ${currentMonth}/${currentYear}) - Tempo Real: ${isCurrentMonth}`);

        // 1. Verifica se já existe relatório
        const existingReport = await prisma.monthlyReport.findUnique({
            where: {
                userId_month_year: { userId, month, year }
            }
        });

        if (existingReport) {
            return res.json(existingReport);
        }

        const isManualRequest = req.query.force === 'true';
        
        // Verifica se o mês já passou completamente

        const isPastMonth = (year < currentYear) || (year === currentYear && month < currentMonth);
        
        // Verifica se hoje é o último dia do mês (usando UTC para consistência)
        const lastDayOfSelectedMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const isLastDay = now.getUTCDate() === lastDayOfSelectedMonth;

        // Se o relatório não existe, só geramos se:
        // 1. For um pedido manual (botão)
        // 2. For um mês que já terminou
        // 3. For o último dia do mês atual
        const shouldGenerate = isManualRequest || isPastMonth || (isCurrentMonth && isLastDay);

        if (!existingReport && !shouldGenerate) {
            return res.status(404).json({ error: "Relatório disponível automaticamente apenas ao final do mês ou via solicitação manual." });
        }





        // 2. Definir intervalo exato do mês (Do primeiro ao último segundo)
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const transactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: startDate, lte: endDate } }
        });

        // Removemos o throw 404 para que o relatório sempre gere, mesmo se o backend achar que tem 0 transações
        // if (transactions.length === 0) {
        //    return res.status(404).json({ error: "Sem transações neste período para análise." });
        // }

        console.log(`[Advisor] Gerando nova análise para ${month}/${year}... transações lidas: ${transactions.length}`);

        // Intervalo do Mês Anterior (Para comparação - também em UTC)
        const prevMonthDate = new Date(Date.UTC(year, month - 2, 1));
        const prevMonthStart = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), 1));
        const prevMonthEnd = new Date(Date.UTC(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth() + 1, 0, 23, 59, 59));

        // Buscando Transações (Anterior)
        const prevTransactions = await prisma.transaction.findMany({
            where: { userId, date: { gte: prevMonthStart, lte: prevMonthEnd } }
        });

        // Agregando Dados
        const income = transactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);

        const prevIncome = prevTransactions.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
        const prevExpense = prevTransactions.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => acc + t.amount, 0);

        // Agregando por Categoria (Top 3 Gastos)
        const categoryMap = new Map<string, number>();
        transactions.filter(t => t.type === 'EXPENSE' && t.isPaid).forEach(t => {
            const current = categoryMap.get(t.category) || 0;
            categoryMap.set(t.category, current + t.amount);
        });

        const topCategories = Array.from(categoryMap.entries())
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);

        // Cálculo de Variação (%)
        const calcDiff = (current: number, prev: number) => {
            if (prev === 0) return current > 0 ? 100 : 0;
            return ((current - prev) / prev) * 100;
        };

        const incomeDiff = parseFloat(calcDiff(income, prevIncome).toFixed(1));
        const expenseDiff = parseFloat(calcDiff(expense, prevExpense).toFixed(1));

        // Pegar nome do usuário
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Chamando IA
        const monthName = startDate.toLocaleString('pt-BR', { month: 'long' });

        const aiResult = await generateMonthlyAnalysis({
            totalIncome: income,
            totalExpense: expense,
            topCategories,
            previousMonthComparison: { incomeDiff, expenseDiff },
            userName: user?.name || "Usuário",
            monthName: `${monthName} de ${year}`,
            isLive: isCurrentMonth
        });

        // 3. Salvando no Banco
        // Se a IA retornar fallback, não salvamos
        if (aiResult.summary.includes("preparada") || aiResult.summary.includes("indisponível")) {
            const reason = "IA retornou fallback";
            console.log(`[Advisor] ${reason}. Não salvando no banco para permitir atualizações.`);
            return res.json({
                ...aiResult,
                id: "temp-fallback",
                userId,
                month,
                year,
                createdAt: new Date(),
                isLive: isCurrentMonth
            });
        }

        const savedReport = await prisma.monthlyReport.upsert({
            where: {
                userId_month_year: { userId, month, year }
            },
            update: {
                verdict: aiResult.verdict as ReportVerdict,
                summary: aiResult.summary,
                insights: aiResult.insights,
                tip: aiResult.tip
            },
            create: {
                userId,
                month,
                year,
                verdict: aiResult.verdict as ReportVerdict,
                summary: aiResult.summary,
                insights: aiResult.insights,
                tip: aiResult.tip
            }
        });

        res.json(savedReport);

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ error: "Falha interna ao gerar relatório inteligente." });
    }
};
