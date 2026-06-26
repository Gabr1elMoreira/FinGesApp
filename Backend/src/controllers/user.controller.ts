import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../prisma/client';
import { z } from 'zod';

const settingsSchema = z.object({
    enabledCategories: z.array(z.string()).optional(),
    preferences: z.record(z.any()).optional(),
});

const profileSchema = z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    avatar: z.string().optional(),
    password: z.string().min(6).optional(),
});

export const updateSettings = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const parsed = settingsSchema.parse(req.body);

        const data: any = {};
        if (parsed.enabledCategories !== undefined) data.enabledCategories = parsed.enabledCategories;

        // Mescla preferências novas com as existentes (não sobrescreve tudo)
        if (parsed.preferences !== undefined) {
            const current = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
            const merged = { ...(current?.preferences as object || {}), ...parsed.preferences };
            data.preferences = merged;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Nenhum dado para atualizar' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data,
        });

        res.json({
            enabledCategories: updatedUser.enabledCategories,
            preferences: updatedUser.preferences ?? null,
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to update settings' });
    }
};

import { hashPassword } from '../utils/auth';

export const updateProfile = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const result = profileSchema.safeParse(req.body);
        if (!result.success) {
            console.error("Profile Validation Error:", result.error.format());
            return res.status(400).json({ error: 'Dados de perfil inválidos', details: result.error.format() });
        }
        const data = result.data;

        const updateData: any = {};
        if (data.name) updateData.name = data.name.toUpperCase();
        if (data.email) updateData.email = data.email.toLowerCase();
        if (data.avatar) updateData.avatar = data.avatar;
        if (data.password) {
            updateData.password = await hashPassword(data.password);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                enabledCategories: true
            }
        });

        res.json({
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            avatar: updatedUser.avatar || '',
            settings: {
                enabledCategories: updatedUser.enabledCategories
            }
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(400).json({ error: 'Failed to update profile' });
    }
};
