import { Router } from 'express';
import { parseTransaction, categorize, chat } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/parse-transaction', parseTransaction);
router.post('/categorize', categorize);
router.post('/chat', chat);

export default router;
