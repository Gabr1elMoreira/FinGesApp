import { app } from './app';
import { connectRedis } from './services/redis.service';

/**
 * Ponto de entrada compatível com Vercel (Serverless).
 * O Socket.io foi removido e substituído por Supabase Realtime,
 * pois o Vercel não suporta conexões persistentes de WebSocket.
 */

const PORT = process.env.PORT || 3000;

// Inicializa o Redis se disponível (falha silenciosa se não houver REDIS_URL)
connectRedis();

// Em produção (Vercel), o app é exportado e o Vercel cuida do servidor.
// Em desenvolvimento local, iniciamos o servidor manualmente.
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    app.listen(PORT, () => {
        console.log(`[LOCAL] FinGes API running on port ${PORT}`);
    });
}

export default app;