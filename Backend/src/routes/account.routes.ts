import { Router } from 'express';
import { getAccounts, createAccount, updateAccount, deleteAccount, transfer } from '../controllers/account.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getAccounts);
router.post('/', createAccount);
router.post('/transfer', transfer);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
