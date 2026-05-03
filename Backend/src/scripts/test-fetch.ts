
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function directTest() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("TESTE DIRETO VIA FETCH");

    // Testando o modelo FLASH 2.0 via API REST pura
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Diga 'Oi, via fetch funcionando!'" }] }]
            })
        });

        const data = await response.json();
        console.log("STATUS:", response.status);
        console.log("RESPOSTA:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("ERRO NO FETCH:", err);
    }
}

directTest();
