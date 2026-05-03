import { Router } from 'express';
import { getMonthlyReport } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getMonthlyReport);

export default router;
