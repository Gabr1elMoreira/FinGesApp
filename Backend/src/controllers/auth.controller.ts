import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    avatar: z.string().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const register = async (req: Request, res: Response) => {
    try {
        // Validação com Zod
        const { email, password, name, avatar } = registerSchema.parse(req.body);

        // Verifica se o usuário já existe
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            return res.status(400).json({ error: 'ESTE E-MAIL JÁ ESTÁ CADASTRADO.' });
        }

        const hashedPassword = await hashPassword(password);

        const defaultCategories = [
            'Salário', 'Investimento', 'Renda Extra',
            'Compras', 'Alimentação', 'Moradia', 'Transporte',
            'Lazer', 'Saúde', 'Educação', 'Cartões',
            'Igreja', 'Outros'
        ];

        // CRIAÇÃO DO USUÁRIO NO POSTGRES VIA PRISMA
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                password: hashedPassword,
                name: name.toUpperCase(), // SALVANDO NOME EM MAIÚSCULO
                avatar,
                enabledCategories: defaultCategories,
                theme: 'dark' // PADRÃO DEFINIDO NO SCHEMA
            },
        });

        const token = generateToken(user.id);

        // RETORNO PADRONIZADO PARA O FRONTEND
        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || '',
                settings: {
                    enabledCategories: user.enabledCategories
                }
            }
        });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(400).json({ error: error instanceof Error ? error.message : 'FALHA NO CADASTRO' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const result = loginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'DADOS INVÁLIDOS', details: result.error.format() });
        }
        const { email, password } = result.data;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user) {
            return res.status(401).json({ error: 'E-MAIL OU SENHA INCORRETOS' });
        }

        const isValid = await comparePassword(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'E-MAIL OU SENHA INCORRETOS' });
        }

        // Atualiza o último login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
        });

        const token = generateToken(user.id);

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || '',
                role: user.role, // Retorna a ROLE para o frontend saber
                settings: {
                    enabledCategories: user.enabledCategories,
                    preferences: user.preferences ?? null
                }
            }
        });
    } catch (error) {
        console.error("Login Error Details:", error);
        res.status(500).json({
            error: 'ERRO INTERNO NO SERVIDOR',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

export const getMe = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ error: "NÃO AUTORIZADO" });
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, avatar: true, enabledCategories: true, role: true, preferences: true }

        });

        if (!user) return res.status(404).json({ error: "USUÁRIO NÃO ENCONTRADO" });

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || '',
            role: user.role,
            settings: {
                enabledCategories: user.enabledCategories,
                preferences: user.preferences ?? null
            }

        });
    } catch (e) {
        res.status(500).json({ error: "ERRO NO SERVIDOR" });
    }
}