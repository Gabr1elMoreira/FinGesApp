import { GoogleGenAI } from "@google/genai";
import { Transaction, User, Goal } from "../types";
import { storageService } from "./storage";

export const aiService = {
  generateFinancialAdvice: async (query: string, transactions: Transaction[], user: User, month: number, year: number) => {
    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || import.meta.env.VITE_API_KEY || "dummy" });

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentMonthLabel = monthNames[month] + " " + year;
    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

    const currentMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });

    const otherTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return !(d.getUTCMonth() === month && d.getUTCFullYear() === year);
    });

    const formatTx = (t: Transaction) => ({
      d: t.description,
      v: t.amount,
      t: t.type,
      c: t.category,
      m: t.paymentMethod,
      dt: t.date
    });

    const categorySummary = currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

    const pastMonthsCount = new Set(otherTxs.map(t => new Date(t.date).getUTCMonth() + "-" + new Date(t.date).getUTCFullYear())).size || 1;
    const historicalExpense = otherTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0) / pastMonthsCount;
    const historicalIncome = otherTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0) / pastMonthsCount;

    const goals = storageService.getGoals(user.id);

    const contextData = {
      mesReferencia: currentMonthLabel,
      mesEmAndamento: isCurrentMonth,
      transacoesMesAtual: currentMonthTxs.map(formatTx),
      historicoRecente: otherTxs.slice(0, 20).map(formatTx),
      resumoCategoriasMesAtual: categorySummary,
      mediasHistoricasMensais: {
        despesas: historicalExpense,
        receitas: historicalIncome
      },
      metasGlobais: goals.map(g => ({
        descricao: g.description,
        alvo: g.targetAmount,
        tipo: g.type,
        progressoAtual: g.currentAmount || 0,
        categoria: g.category
      })),
      saldoMesAtual: currentMonthTxs.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0),
      totalGastosMesAtual: currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0)
    };

    const systemInstruction = "Você é o FinGes AI, assistente financeiro avançado e proativo de " + user.name + ".\nCONTEXTO ATUAL: O usuário visualiza os dados de " + currentMonthLabel + ". O mês está " + (isCurrentMonth ? "em andamento" : "fechado") + ".\n\nDADOS PARA ANÁLISE:\n" + JSON.stringify(contextData) + "\n\nREGRAS DE CONDUTA DA IA:\n1. PROATIVIDADE E PREVISÃO: Como o mês está " + (isCurrentMonth ? "ativo, projete os gastos até o fim do mês usando a média histórica e os gastos atuais" : "fechado, analise o resultado final") + ". Mostre previsões de saldo se o comportamento atual continuar.\n2. INTEGRAÇÃO COM METAS: Avalie rigorosamente como os gastos atuais afetam as metasGlobais. Dê alertas se limites estiverem sendo quebrados ou celebre se a meta de economia estiver alcançável.\n3. EXPLICABILIDADE: Ao fazer afirmações, justifique comparando com o histórico (mediasHistoricasMensais) ou citando resumoCategoriasMesAtual. Não apenas jogue o número solto.\n4. FOCO TEMPORAL: Responda sobre " + currentMonthLabel + " por padrão, a menos que uma comparação ampla seja pedida.\n5. RESPOSTA DIRETA: Formatação limpa em Markdown. Seja analítico, estratégico e conciso. Não encha linguiça. Use valores monetários formatados (R$ 0,00).\n\nSUGESTÕES DINÂMICAS:\nAo final da resposta, adicione SEMPRE dicas do que perguntar a seguir no formato:\n[SUGESTOES]\nPergunta proativa sobre previsões\nPergunta sobre metas\nPergunta sobre onde economizar mais";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return response.text || "Não consegui processar suas projeções e análises agora.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Estou temporariamente indisponível. Verifique sua chave de conexão.";
    }
  },

  generateProactiveAlerts: async (transactions: Transaction[], user: User): Promise<string[]> => {
    const alerts: string[] = [];
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();

    const currentMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });

    const expenses = currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const goals = storageService.getGoals(user.id);

    goals.filter(g => g.type === 'SPENDING_LIMIT').forEach(g => {
      let specificExpenses = expenses;
      if (g.category) {
        specificExpenses = currentMonthTxs.filter(t => t.type === 'EXPENSE' && t.category === g.category).reduce((acc, t) => acc + t.amount, 0);
      }

      if (specificExpenses > g.targetAmount) {
        alerts.push("[ALERTA] Você excedeu o limite de R$ " + g.targetAmount.toFixed(2) + " para a meta '" + g.description + "'.");
      } else if (specificExpenses > g.targetAmount * 0.8) {
        alerts.push("[ATENÇÃO] Você já gastou " + ((specificExpenses / g.targetAmount) * 100).toFixed(0) + "% do seu limite para '" + g.description + "'.");
      }
    });

    return alerts;
  }
};
