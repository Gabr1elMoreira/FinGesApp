import { Router } from 'express';
import { getBudgets, upsertBudget, deleteBudget } from '../controllers/budget.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getBudgets);
router.post('/', upsertBudget);
router.delete('/:id', deleteBudget);

export default router;
