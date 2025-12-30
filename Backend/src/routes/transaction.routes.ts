import { Router } from 'express';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getPendingTransactions, clearAllTransactions } from '../controllers/transaction.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // Protect all routes

router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/clear', clearAllTransactions);
router.delete('/:id', deleteTransaction);

export default router;
