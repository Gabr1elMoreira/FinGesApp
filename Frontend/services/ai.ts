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

    const activeGoals = goals.filter(g => {
      if (!g.deadline) return true;
      const d = new Date(g.deadline);
      if (d.getUTCFullYear() < year) return false;
      if (d.getUTCFullYear() === year && d.getUTCMonth() < month) return false;
      return true;
    });

    // Agregando dados inteligentes para precisão sem travar o navegador
    const income = currentMonthTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const expense = currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    
    // Top 30 maiores gastos para saber "Qual foi o maior gasto"
    const topTransactions = [...currentMonthTxs]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 30)
      .map(t => `${t.description}: R$ ${t.amount} (${t.category})`);

    // Resumo de Métodos de Pagamento
    const methodMap = new Map<string, number>();
    currentMonthTxs.forEach(t => {
      methodMap.set(t.paymentMethod, (methodMap.get(t.paymentMethod) || 0) + 1);
    });
    const topMethods = Array.from(methodMap.entries()).map(([m, count]) => `${m}: ${count}x`);

    const contextData = {
      mes: currentMonthLabel,
      totalReceita: income,
      totalDespesa: expense,
      maioresGastos: topTransactions,
      frequenciaMetodos: topMethods,
      metasAtivas: activeGoals.map(g => g.description)
    };

    const systemInstruction = "Você é o FinGes AI de " + user.name + ". Responda de forma estratégica, limpa (sem poluição de negritos) e com espaçamento duplo. Analise os dados fornecidos para responder perguntas sobre maiores gastos, métodos mais usados e metas. Dados: " + JSON.stringify(contextData);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return response.text || "Não consegui processar agora.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Estou temporariamente indisponível.";
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
    const activeGoals = goals.filter(g => {
      if (!g.deadline) return true;
      const deadlineDate = new Date(g.deadline);
      const deadlineMonth = deadlineDate.getUTCMonth();
      const deadlineYear = deadlineDate.getUTCFullYear();
      
      if (deadlineYear < year) return false;
      if (deadlineYear === year && deadlineMonth < month) return false;
      return true;
    });

    activeGoals.filter(g => g.type === 'SPENDING_LIMIT').forEach(g => {
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
