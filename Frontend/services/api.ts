const API_URL = "https://fingesapp.vercel.app";

export async function apiRequest(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem("finanza_token");

    // 1. LIMPEZA DA URL: Remove barras extras para evitar //
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${API_URL}${cleanPath}`;

    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    if (token) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers,
        });

        // Se a resposta for 204 (No Content), retorna vazio
        if (response.status === 204) return null;

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            const errorMessage = data?.error || "Erro na API";
            const error: any = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (err: any) {
        // Se cair aqui, é erro de rede ou DNS
        console.error("ERRO DE CONEXÃO:", err.message);
        throw new Error("Não foi possível conectar ao servidor. Verifique sua internet.");
    }
}