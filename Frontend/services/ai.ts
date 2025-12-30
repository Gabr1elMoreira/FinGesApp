
import { GoogleGenAI } from "@google/genai";
import { Transaction, User } from "../types";

export const aiService = {
  generateFinancialAdvice: async (query: string, transactions: Transaction[], user: User, month: number, year: number) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const currentMonthLabel = `${monthNames[month]} ${year}`;

    // Particionar transações para dar foco ao mês selecionado
    const currentMonthTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getUTCMonth() === month && d.getUTCFullYear() === year;
    });

    const otherTxs = transactions.filter(t => {
      const d = new Date(t.date);
      return !(d.getUTCMonth() === month && d.getUTCFullYear() === year);
    }).slice(0, 20); // Pegar apenas algumas recentes para contexto histórico

    const formatTx = (t: Transaction) => ({
      d: t.description,
      v: t.amount,
      t: t.type,
      c: t.category,
      m: t.paymentMethod,
      dt: t.date
    });

    const contextData = {
      mesReferencia: currentMonthLabel,
      transacoesMesAtual: currentMonthTxs.map(formatTx),
      historicoRecente: otherTxs.map(formatTx),
      saldoMesAtual: currentMonthTxs.reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0),
      totalGastosMesAtual: currentMonthTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0)
    };

    const systemInstruction = `
      Você é o FinGes AI, mentor financeiro de ${user.name}.
      CONTEXTO ATUAL: O usuário está visualizando os dados de ${currentMonthLabel}.
      
      DADOS PARA ANÁLISE:
      ${JSON.stringify(contextData)}
      
      REGRAS DE OURO (NÃO VIOLAR):
      1. FOCO TEMPORAL: Se o usuário pedir "resumo", "gastos" ou "análise" sem especificar o mês, refira-se APENAS aos dados de ${currentMonthLabel}. 
      2. PRECISÃO: Não misture transações do mês atual com o histórico recente a menos que o usuário peça uma comparação.
      3. RESPOSTA DIRETA: Responda APENAS o que foi solicitado. Se pedirem um resumo de gastos, não dê dicas de economia a menos que o usuário peça sugestões.
      4. FORMATAÇÃO: Markdown minimalista. Use R$ 0,00. Evite negritos desnecessários.
      5. PRIVACIDADE: Ignore transações que não fazem parte do contexto solicitado.
      
      SUGESTÕES DINÂMICAS:
      Ao final da resposta, adicione SEMPRE:
      [SUGESTOES]
      Pergunta curta 1
      Pergunta curta 2
      Pergunta curta 3
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: query,
        config: {
          systemInstruction,
          temperature: 0.3, // Menor temperatura para mais precisão
        },
      });

      // Correctly access the .text property from GenerateContentResponse
      return response.text || "Não consegui processar sua análise agora.";
    } catch (error) {
      console.error("AI Error:", error);
      return "Estou temporariamente indisponível. Verifique sua chave de API ou conexão.";
    }
  }
};
