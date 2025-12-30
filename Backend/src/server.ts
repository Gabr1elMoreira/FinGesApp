import { app } from './app';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;

// Na Vercel, o app.listen não é necessário, mas mantemos para rodar local.
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

export default app; // Adicione isso para garantir que a Vercel identifique a função