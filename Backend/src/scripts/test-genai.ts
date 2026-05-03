
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function testNewSDK() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("--- TESTE NOVO SDK (@google/genai) ---");

    if (!apiKey) {
        console.error("Chave não encontrada.");
        return;
    }

    const ai = new GoogleGenAI({ apiKey });

    try {
        console.log("Enviando pergunta para gemini-3-flash-preview...");
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Diga 'Sistema OK via Novo SDK'"
        });
        console.log("✅ RESPOSTA:", response.text);
    } catch (error: any) {
        console.error("❌ ERRO NO TESTE:", error);
    }
}

testNewSDK();
