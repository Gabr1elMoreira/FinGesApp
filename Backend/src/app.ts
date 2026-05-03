import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import authRoutes from './routes/auth.routes';
import transactionRoutes from './routes/transaction.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// 1. Configuração de CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// 2. Configuração de Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. Rotas
app.get('/', (req, res) => {
    res.send('FinGes API is running');
});

app.use('/auth', authRoutes);
app.use('/transactions', transactionRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/reports', reportRoutes);

export { app };