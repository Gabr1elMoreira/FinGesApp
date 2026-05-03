import prisma from '../prisma/client';

/**
 * Nota: Como a hospedagem é no Vercel (Serverless), o Socket.io não é suportado.
 * Estamos migrando para Supabase Realtime. 
 * Estas funções agora salvam no banco de dados, e o Frontend escuta as mudanças via Supabase SDK.
 */

export const emitAuditLog = async (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    try {
        await prisma.auditLog.create({
            data: {
                message,
                type
            }
        });
    } catch (error) {
        console.error('Erro ao salvar log de auditoria:', error);
    }
};

export const broadcastMessage = async (message: string, title: string = "Comunicado do Sistema") => {
    try {
        await prisma.systemBroadcast.create({
            data: {
                title,
                message,
                active: true
            }
        });
    } catch (error) {
        console.error('Erro ao criar broadcast:', error);
    }
};
