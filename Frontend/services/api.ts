const API_URL = import.meta.env.VITE_API_BASE_URL || "https://finges-backend.vercel.app";

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
            const detailStr = data?.details ? JSON.stringify(data.details) : "";
            const errorMessage = data?.error ? `${data.error} ${detailStr}` : "Erro na API";
            const error: any = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        return data;
    } catch (err: any) {
        // Se o erro já tem status, é um erro da API que nós lançamos acima
        if (err.status) {
            throw err;
        }

        // Se cair aqui, é erro de rede ou DNS
        console.error("ERRO DE CONEXÃO:", err.message);
        throw new Error(`Servidor inacessível (${url}). Certifique-se de que o Backend está rodando e o endereço está correto.`);
    }
}