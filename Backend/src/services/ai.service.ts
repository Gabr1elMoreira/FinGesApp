
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// No Backend mantemos GEMINI_API_KEY para coincidir com o .env
const apiKey = process.env.GEMINI_API_KEY;

export interface AIAnalysisResult {
    verdict: "EXCELLENT" | "STABLE" | "CRITICAL";
    summary: string;
    insights: string[];
    tip: string;
}

export const generateMonthlyAnalysis = async (data: any): Promise<AIAnalysisResult> => {
    // Verificação robusta da chave
    if (!apiKey || apiKey === "your_key_here" || apiKey === "") {
        console.error("❌ BACKEND: GEMINI_API_KEY não encontrada no .env");
        return getFallbackResponse("Configure sua chave GEMINI_API_KEY no arquivo .env do Backend.");
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
    Atue como um Assessor Financeiro Avançado e Analítico.
    Gere uma análise estritamente em formato JSON.

    DIRETRIZES DE ANÁLISE (OBRIGATÓRIO):
    1. EXCLUSIVIDADE: Cada item na matriz de "insights" DEVE focar em uma categoria diferente das "Categorias Principais" enviadas. Não repita assuntos.
    2. DETALHAMENTO: Analise o valor gasto em relação à receita total. Se o mês estiver EM ANDAMENTO, projete o gasto final com base no ritmo atual.
    3. COMPARATIVO: Use os dados de "Variação x Mês Anterior" para dizer se o usuário está melhorando ou piorando em relação ao mês passado.

    REGRAS DE FORMATAÇÃO (CRÍTICO):
    1. LIMPEZA: Não use negritos (**) ou hashtags (###) dentro dos textos. Use texto limpo e direto.
    2. ESPAÇAMENTO: Mantenha as frases curtas e objetivas.
    
    ESTRUTURA DE RETORNO:
    {
      "verdict": "EXCELLENT" | "STABLE" | "CRITICAL",
      "summary": "Resumo analítico do mês em 1 frase.",
      "insights": [
        "[Categoria] Insight detalhado sobre essa categoria e projeção.",
        "[Categoria] Insight focado em outra categoria relevante.",
        "[Geral] Insight sobre o saldo final ou comportamento de gastos."
      ],
      "tip": "Dica prática de economia ou investimento para o próximo passo."
    }
    `;



    const userPrompt = `
    Analise os dados de ${data.monthName} para o usuário ${data.userName}:
    Status do Mês: ${data.isLive ? 'EM ANDAMENTO (Gere Projeções nos Alertas)' : 'FECHADO (Faça Balanço Final)'}
    Receita: R$ ${data.totalIncome}
    Despesa: R$ ${data.totalExpense}
    Categorias Principais: ${JSON.stringify(data.topCategories)}
    Variação x Mês Anterior (Positivo significa aumento):
    - Receita: ${data.previousMonthComparison.incomeDiff}%
    - Despesa: ${data.previousMonthComparison.expenseDiff}%
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: userPrompt,
            config: {
                systemInstruction,
                temperature: 0.2
            }
        });

        const text = response.text || "";
        console.log("--- IA BACKEND RESPONSE ---");
        console.log(text);

        // Limpeza extra para garantir o JSON
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : text;

        return JSON.parse(jsonStr) as AIAnalysisResult;
    } catch (error: any) {
        console.error("❌ BACKEND AI ERROR:", error.message || error);
        const isQuota = error.message?.includes("429");
        return getFallbackResponse(isQuota ? "Limite de quota do Google atingido. Tente novamente em 1 minuto." : "Erro na conexão com Google AI.");
    }
};

export const generateAdminInsights = async (stats: any): Promise<string[]> => {
    if (!apiKey || apiKey === "" || apiKey === "your_key_here") {
        return ["AI Copilot: Chave de API não configurada. Verifique o .env do Backend."];
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
    Atue como um Especialista em Operações de FinTech e Gestor de Crescimento.
    Analise estas estatísticas globais da plataforma FinGes:
    - Total de Usuários: ${stats.totalUsers}
    - Usuários Ativos (24h): ${stats.activeUsers}
    - Volume Total de Transações: ${stats.totalTransactions}
    - Retenção (Ativos/Total): ${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%

    Gere 3 insights estratégicos curtos (máximo 15 palavras cada) para o administrador da plataforma.
    Foque em: Engajamento, Saúde do Sistema e Sugestões de Monetização ou Crescimento.
    Retorne apenas uma lista simples de strings, uma por linha, sem números.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { temperature: 0.7 }
        });

        const text = response.text || "";
        return text.split('\n').filter(line => line.trim().length > 5).slice(0, 3);
    } catch (error) {
        return ["Erro ao gerar insights globais.", "Verifique a conexão com Google AI."];
    }
};

function getFallbackResponse(message: string): AIAnalysisResult {
    return {
        verdict: "STABLE",
        summary: "Análise inteligente em processamento ou indisponível. ☕",
        insights: [
            message,
            "Continue registrando suas despesas diárias.",
            "Utilize os filtros de data para ver transações específicas."
        ],
        tip: "Dica: Caso tenha trocado a chave agora, lembre-se de REINICIAR seu terminal do Backend."
    };
}
