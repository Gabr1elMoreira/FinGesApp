
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

// Carregar .env explicitamente do diretório pai se necessário
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function testAI() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("--- TESTE DE IA BACKEND ---");
    console.log("Chave encontrada:", apiKey ? "SIM (Inicia com " + apiKey.substring(0, 5) + "...)" : "NÃO");

    if (!apiKey || apiKey === "your_key_here") {
        console.error("❌ ERRO: A chave no .env ainda é a padrão ou está vazia.");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        console.log("Enviando pergunta de teste para o Google...");
        const result = await model.generateContent("Diga 'Olá, sistema funcionando!'");
        const response = await result.response;
        console.log("✅ RESPOSTA DA IA:", response.text());
    } catch (error: any) {
        console.error("❌ FALHA CRÍTICA NA API:");
        console.error("Mensagem:", error.message);
        if (error.stack?.includes("fetch failed")) {
            console.error("Causa: Erro de conexão/rede (Fetch failed).");
        }
    }
}

testAI();
