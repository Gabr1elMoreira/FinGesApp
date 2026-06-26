import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { parseTransactionText, suggestCategory, generateChatResponse } from '../services/ai.service';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const round2 = (n: number) => Math.round(n * 100) / 100;

// Monta um retrato financeiro REAL e calculado a partir dos dados do usuário,
// para a IA responder com números verdadeiros (não um dump truncado).
const buildFinancialContext = (txs: any[], goals: any[], budgets: any[], accounts: any[], month: number, year: number) => {
    const inMonth = (d: Date, m: number, y: number) => d.getUTCMonth() === m && d.getUTCFullYear() === y;
    const isExp = (t: any) => t.type === 'EXPENSE';
    const isInc = (t: any) => t.type === 'INCOME';

    const refTxs = txs.filter(t => inMonth(new Date(t.date), month, year));
    const refIncome = refTxs.filter(t => isInc(t) && t.isPaid).reduce((s, t) => s + t.amount, 0);
    const refExpense = refTxs.filter(t => isExp(t) && t.isPaid).reduce((s, t) => s + t.amount, 0);
    const pending = refTxs.filter(t => isExp(t) && !t.isPaid);

    const byCategory: Record<string, number> = {};
    refTxs.filter(t => isExp(t)).forEach(t => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });
    const categorias = Object.entries(byCategory).map(([categoria, total]) => ({ categoria, total: round2(total) }))
        .sort((a, b) => b.total - a.total);

    const topGastos = [...refTxs].filter(t => isExp(t)).sort((a, b) => b.amount - a.amount).slice(0, 5)
        .map(t => ({ descricao: t.description, valor: round2(t.amount), categoria: t.category }));

    // Série dos últimos 6 meses (a partir do mês de referência)
    const serie: { mes: string; receitas: number; despesas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(Date.UTC(year, month - i, 1));
        const m = d.getUTCMonth(), y = d.getUTCFullYear();
        const mTxs = txs.filter(t => inMonth(new Date(t.date), m, y));
        serie.push({
            mes: `${MONTHS_SHORT[m]}/${String(y).slice(2)}`,
            receitas: round2(mTxs.filter(t => isInc(t) && t.isPaid).reduce((s, t) => s + t.amount, 0)),
            despesas: round2(mTxs.filter(t => isExp(t) && t.isPaid).reduce((s, t) => s + t.amount, 0)),
        });
    }

    // Médias históricas (meses com algum lançamento, exceto o de referência)
    const monthKeys = new Set(txs.map(t => { const d = new Date(t.date); return `${d.getUTCFullYear()}-${d.getUTCMonth()}`; }));
    monthKeys.delete(`${year}-${month}`);
    const histMonths = Math.max(1, monthKeys.size);
    const histExpenseTotal = txs.filter(t => isExp(t) && !inMonth(new Date(t.date), month, year)).reduce((s, t) => s + t.amount, 0);
    const histIncomeTotal = txs.filter(t => isInc(t) && !inMonth(new Date(t.date), month, year)).reduce((s, t) => s + t.amount, 0);

    // Compromissos recorrentes (1 por série: tipo+descrição+categoria, o mais recente)
    const recurringMap: Record<string, any> = {};
    txs.filter(t => t.isRecurrent).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .forEach(t => { const k = `${t.type}-${t.description.toLowerCase()}-${t.category}`; if (!recurringMap[k]) recurringMap[k] = t; });
    const recorrentes = Object.values(recurringMap).map((t: any) => ({ descricao: t.description, valor: round2(t.amount), tipo: t.type, categoria: t.category }));
    const totalRecorrenteMensal = round2(recorrentes.filter(r => r.tipo === 'EXPENSE').reduce((s, r) => s + r.valor, 0));

    // Saldos das contas
    const balByAcc: Record<string, number> = {};
    txs.filter(t => t.isPaid && t.accountId).forEach(t => {
        let delta = 0;
        if (isInc(t)) delta = t.amount;
        else if (isExp(t)) delta = -t.amount;
        else if (t.type === 'TRANSFER') delta = t.category === 'Transferência Recebida' ? t.amount : -t.amount;
        balByAcc[t.accountId] = (balByAcc[t.accountId] || 0) + delta;
    });
    const contas = accounts.map(a => ({ nome: a.name, tipo: a.type, saldo: round2(a.initialBalance + (balByAcc[a.id] || 0)) }));
    const patrimonioEmContas = round2(contas.reduce((s, c) => s + c.saldo, 0));

    // Orçamentos do mês de referência vs gasto
    const orcamentos = budgets.map(b => ({
        categoria: b.category,
        limite: round2(b.amount),
        gasto: round2(byCategory[b.category] || 0),
        percentual: b.amount > 0 ? Math.round(((byCategory[b.category] || 0) / b.amount) * 100) : 0,
    }));

    // Metas
    const metas = goals.map(g => ({
        descricao: g.description, tipo: g.type, alvo: round2(g.targetAmount),
        atual: round2(g.currentAmount || 0), categoria: g.category || null,
        progresso: g.targetAmount > 0 ? Math.round(((g.currentAmount || 0) / g.targetAmount) * 100) : 0,
    }));

    return {
        mesReferencia: `${MONTHS[month]} de ${year}`,
        mesEmAndamento: new Date().getUTCMonth() === month && new Date().getUTCFullYear() === year,
        resumoMesReferencia: {
            receitas: round2(refIncome),
            despesas: round2(refExpense),
            saldo: round2(refIncome - refExpense),
            contasPendentes: pending.length,
            totalPendente: round2(pending.reduce((s, t) => s + t.amount, 0)),
        },
        gastosPorCategoria: categorias,
        maioresGastos: topGastos,
        evolucao6Meses: serie,
        mediasMensaisHistoricas: { receitas: round2(histIncomeTotal / histMonths), despesas: round2(histExpenseTotal / histMonths) },
        compromissosRecorrentes: recorrentes,
        totalRecorrenteMensalDespesas: totalRecorrenteMensal,
        contas,
        patrimonioEmContas,
        orcamentos,
        metas,
        totaisGerais: {
            receitaTotalHistorica: round2(txs.filter(t => isInc(t) && t.isPaid).reduce((s, t) => s + t.amount, 0)),
            despesaTotalHistorica: round2(txs.filter(t => isExp(t) && t.isPaid).reduce((s, t) => s + t.amount, 0)),
            totalTransacoes: txs.length,
        },
    };
};

// Chat financeiro fundamentado nos dados reais do usuário
export const chat = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { question, month, year } = req.body;
        if (!question || typeof question !== 'string') {
            return res.status(400).json({ error: 'Pergunta é obrigatória' });
        }
        const m = Number.isInteger(month) ? month : new Date().getUTCMonth();
        const y = Number.isInteger(year) ? year : new Date().getUTCFullYear();

        const [user, txs, goals, budgets, accounts] = await Promise.all([
            prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
            prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
            prisma.goal.findMany({ where: { userId } }),
            prisma.budget.findMany({ where: { userId, month: m, year: y } }),
            prisma.account.findMany({ where: { userId } }),
        ]);

        const context = buildFinancialContext(txs, goals, budgets, accounts, m, y);
        const result = await generateChatResponse(question.slice(0, 500), user?.name || 'usuário', context);
        res.json(result);
    } catch (error) {
        console.error('AI CHAT ERROR:', error);
        res.status(500).json({ error: 'Erro ao processar a conversa com a IA' });
    }
};

// Interpreta linguagem natural e devolve um rascunho de transação
export const parseTransaction = async (req: AuthRequest, res: Response) => {
    const { text, categories } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Texto é obrigatório' });
    }
    const cats: string[] = Array.isArray(categories) && categories.length ? categories : ['Outros'];
    const today = new Date().toISOString().split('T')[0];

    const parsed = await parseTransactionText(text.slice(0, 300), cats, today);
    if (!parsed) {
        return res.status(422).json({ error: 'Não consegui interpretar. Tente: "gastei 50 no mercado no pix".' });
    }
    res.json(parsed);
};

// Sugere a categoria mais provável a partir da descrição
export const categorize = async (req: AuthRequest, res: Response) => {
    const { description, categories } = req.body;
    if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'Descrição é obrigatória' });
    }
    const cats: string[] = Array.isArray(categories) && categories.length ? categories : ['Outros'];
    const category = await suggestCategory(description.slice(0, 200), cats);
    if (!category) return res.status(422).json({ error: 'Sem sugestão disponível' });
    res.json({ category });
};
