import { Transaction } from '../types';

export interface ProjectedBill extends Transaction {
  isPaid: boolean;
  paidId?: string;
  paidDate?: string;
}

export const recurringService = {
  /**
   * Extrai modelos únicos de transações recorrentes (Ganhos e Gastos).
   * Prioriza a transação MAIS RECENTE para pegar valores/descrições atualizados.
   */
  getRecurringTemplates: (transactions: Transaction[]): Transaction[] => {
    const templates: Record<string, Transaction> = {};

    transactions
      .filter(t => t.isRecurrent)
      // Ordena decrescente (mais recente primeiro) para capturar a última versão
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(t => {
        const key = `${t.type}-${t.description.toLowerCase()}-${t.category}`;
        if (!templates[key]) {
          templates[key] = t;
        }
      });

    return Object.values(templates);
  },

  /**
   * Projeta os status das contas para um mês/ano específico.
   * Lógica unificada:
   * 1. Se existe transação real (paga ou pendente) no mês que bate com o template -> Mostra a Real.
   * 2. Se não existe -> Mostra Projeção (Pendente).
   * 3. Adiciona pendências manuais avulsas que não bateram com templates.
   */
  getMonthlyProjection: (
    templates: Transaction[],
    transactions: Transaction[],
    month: number,
    year: number
  ): ProjectedBill[] => {

    const consumedIds = new Set<string>();

    const projections = templates.map((template): ProjectedBill | null => {
      // Busca transação REAL correspondente neste mês (Paga ou Pendente)
      const match = transactions.find(t =>
        t.type === template.type &&
        t.description.toLowerCase() === template.description.toLowerCase() &&
        t.category === template.category &&
        new Date(t.date).getUTCMonth() === month &&
        new Date(t.date).getUTCFullYear() === year
      );

      // Se achou correspondência real, usamos ela (seja paga ou pendente)
      if (match) {
        consumedIds.add(match.id);
        return {
          ...match,
          isPaid: match.isPaid, // Respeita o status real
          paidId: match.id,
          paidDate: match.date
        };
      }

      // Se não achou real, verificamos se devemos projetar
      const templateDate = new Date(template.date);
      const startMonth = templateDate.getUTCMonth();
      const startYear = templateDate.getUTCFullYear();

      // Lógica de visualização temporal (não projetar antes do início)
      if (year < startYear || (year === startYear && month < startMonth)) {
        return null;
      }

      // Lógica de Frequência
      if (template.recurrenceFrequency === 'YEARLY') {
        if (month !== startMonth) return null;
      }

      const originalDay = templateDate.getUTCDate();
      const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const projectedDay = Math.min(originalDay, lastDayOfMonth);
      const projectedDateStr = new Date(Date.UTC(year, month, projectedDay)).toISOString();

      return {
        ...template,
        id: `temp-${template.id}-${month}-${year}`,
        date: projectedDateStr,
        isPaid: false,
        paidId: undefined,
        paidDate: undefined
      };
    }).filter((b): b is ProjectedBill => b !== null);

    // Adiciona transações avulsas PENDENTES desse mês que não bateram com templates
    const manualPending = transactions
      .filter(t => {
        const d = new Date(t.date);
        const isThisMonth = d.getUTCMonth() === month && d.getUTCFullYear() === year;
        return isThisMonth && !consumedIds.has(t.id) && !t.isPaid;
      })
      .map(t => ({
        ...t,
        isPaid: false
      }));

    const allBills = [...projections, ...manualPending];

    // Ordenação final por dia
    return allBills.sort((a, b) => new Date(a.date).getUTCDate() - new Date(b.date).getUTCDate());
  },

  calculateStats: (projectedBills: ProjectedBill[]) => {
    const expenses = projectedBills.filter(b => b.type === 'EXPENSE');
    const income = projectedBills.filter(b => b.type === 'INCOME');

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const paidExpenses = expenses.filter(s => s.isPaid).reduce((acc, curr) => acc + curr.amount, 0);
    const pendingExpenses = totalExpenses - paidExpenses;

    const totalIncome = income.reduce((acc, curr) => acc + curr.amount, 0);
    const receivedIncome = income.filter(s => s.isPaid).reduce((acc, curr) => acc + curr.amount, 0);

    const progress = totalExpenses > 0 ? (paidExpenses / totalExpenses) * 100 : 0;

    return {
      total: totalExpenses,
      paid: paidExpenses,
      pending: pendingExpenses,
      totalIncome,
      receivedIncome,
      progress
    };
  }
};