
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

// Extrai UMA transação a partir de linguagem natural ("gastei 50 no mercado no pix").
export const parseTransactionText = async (text: string, categories: string[], todayISO: string): Promise<any | null> => {
    if (!apiKey || apiKey === '' || apiKey === 'your_key_here') return null;
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você extrai UMA transação financeira a partir de uma frase em português e responde SOMENTE com JSON válido, sem texto extra.
Regras:
- type: "EXPENSE" para gastos (gastei, paguei, comprei, conta) ou "INCOME" para recebimentos (recebi, ganhei, salário).
- amount: número positivo em reais (ex: 50.0), sem símbolos nem separador de milhar.
- category: escolha a MAIS provável EXATAMENTE entre estas opções: ${categories.join(' | ')}.
- paymentMethod: um de CASH, PIX, DEBIT, CREDIT, OTHER. Use PIX se não houver indício.
- date: formato YYYY-MM-DD. Hoje é ${todayISO}. Entenda "hoje", "ontem", "anteontem".
- description: curta e clara (ex: "Mercado", "Uber", "Salário").
- isPaid: true se já ocorreu; false se é conta futura a pagar.
Responda exatamente: {"description": string, "amount": number, "type": "INCOME"|"EXPENSE", "category": string, "paymentMethod": string, "date": string, "isPaid": boolean}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: { systemInstruction, temperature: 0.1 },
        });
        const raw = response.text || '';
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return null;
        const parsed = JSON.parse(match[0]);
        // Garante categoria válida
        if (parsed.category && !categories.includes(parsed.category)) {
            const found = categories.find(c => c.toLowerCase() === String(parsed.category).toLowerCase());
            parsed.category = found || categories[0];
        }
        return parsed;
    } catch (error) {
        return null;
    }
};

// Sugere a categoria mais provável para uma descrição.
export const suggestCategory = async (description: string, categories: string[]): Promise<string | null> => {
    if (!apiKey || apiKey === '' || apiKey === 'your_key_here') return null;
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Descrição de uma transação: "${description}". Escolha a categoria MAIS provável EXATAMENTE entre: ${categories.join(' | ')}. Responda SOMENTE com o nome exato da categoria, sem mais nada.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { temperature: 0 },
        });
        const out = (response.text || '').trim();
        const found = categories.find(c => out.toLowerCase().includes(c.toLowerCase()));
        return found || null;
    } catch (error) {
        return null;
    }
};

// Chat fundamentado: recebe a pergunta + um contexto financeiro JÁ CALCULADO (números reais)
// e responde citando os dados reais do usuário, sem inventar valores.
export const generateChatResponse = async (
    question: string,
    userName: string,
    context: any
): Promise<{ answer: string; suggestions: string[] }> => {
    if (!apiKey || apiKey === '' || apiKey === 'your_key_here') {
        return { answer: 'A IA está indisponível: configure a GEMINI_API_KEY no backend.', suggestions: [] };
    }
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Você é o FinGes AI, assistente financeiro pessoal de ${userName}.

REGRAS (OBRIGATÓRIAS):
1. Use SOMENTE os números do bloco DADOS FINANCEIROS abaixo. NUNCA invente valores. Se algo não estiver nos dados, diga claramente que não há registro.
2. Cite valores reais em R$ e compare com médias/meses anteriores e orçamentos quando fizer sentido.
3. Termine com UMA recomendação prática e acionável.
4. Português, tom claro e direto. Markdown puro (sem ** ou ###), parágrafos curtos separados por quebra de linha dupla.

DADOS FINANCEIROS (fatos já calculados do usuário):
${JSON.stringify(context)}

FORMATO DE RESPOSTA: responda APENAS um JSON válido no formato:
{"answer": "<sua resposta em markdown>", "suggestions": ["pergunta curta 1", "pergunta curta 2", "pergunta curta 3"]}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: question,
            config: {
                systemInstruction,
                temperature: 0.3,
                responseMimeType: 'application/json',
            },
        });
        const raw = response.text || '';
        const match = raw.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : { answer: raw, suggestions: [] };
        return {
            answer: parsed.answer || 'Não consegui processar sua análise agora.',
            suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        };
    } catch (error: any) {
        const isQuota = error?.message?.includes('429');
        return {
            answer: isQuota
                ? 'Atingi o limite de uso da IA no momento. Tente novamente em 1 minuto.'
                : 'Estou temporariamente indisponível. Tente novamente em instantes.',
            suggestions: [],
        };
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
