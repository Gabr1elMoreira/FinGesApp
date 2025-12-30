import { apiRequest } from "./api";
import { User } from "../types";

type LoginResponse = {
    token: string;
    user: User;
};

// FUNÇÃO DE LOGIN EXISTENTE
export async function login(
    email: string,
    password: string
): Promise<LoginResponse> {
    const response = await apiRequest("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password
        }),
    });

    if (!response?.token || !response?.user) {
        throw new Error("FALHA NO LOGIN: RESPOSTA INVÁLIDA DA API");
    }

    return response as LoginResponse;
}

// NOVA FUNÇÃO DE REGISTRO
export async function register(
    email: string,
    password: string,
    name: string
): Promise<LoginResponse> {
    const response = await apiRequest("/auth/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
            name: name // O NOME JÁ VEM EM MAIÚSCULO DO COMPONENTE
        }),
    });

    if (!response?.token || !response?.user) {
        throw new Error("FALHA NO CADASTRO: RESPOSTA INVÁLIDA DA API");
    }

    return response as LoginResponse;
}