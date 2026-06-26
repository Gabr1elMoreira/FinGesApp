import { Router } from 'express';
import { getGoals, createGoal, updateGoal, deleteGoal, addContribution } from '../controllers/goal.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getGoals);
router.post('/', createGoal);
router.put('/:id', updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/contributions', addContribution);

export default router;
