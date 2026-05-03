import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../prisma/client';

export const isAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'NÃO AUTORIZADO' });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'ACESSO NEGADO. APENAS ADMINISTRADORES.' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'ERRO NO SERVIDOR' });
    }
};
