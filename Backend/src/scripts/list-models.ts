
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return console.error("Sem chave");

    try {
        // Usando fetch direto para listar modelos disponíveis para essa chave
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await resp.json();
        console.log("MODELOS DISPONÍVEIS:");
        if (data.models) {
            data.models.forEach((m: any) => console.log(`- ${m.name} (${m.supportedGenerationMethods})`));
        } else {
            console.log("Nenhum modelo listado. Resposta completa:", JSON.stringify(data));
        }
    } catch (err) {
        console.error("Erro ao listar modelos:", err);
    }
}

listModels();
