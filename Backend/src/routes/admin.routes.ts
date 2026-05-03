import { Router } from 'express';
import { getStats, getUsers, deleteUser, toggleRole, getAdminAIInsights, sendBroadcast, getLatestBroadcast } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';

const router = Router();

router.use(authenticate);

router.get('/latest-broadcast', getLatestBroadcast); // Todos os logados podem ver
router.use(isAdmin); // A partir daqui, apenas ADMIN

router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/ai-insights', getAdminAIInsights);
router.post('/broadcast', sendBroadcast);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', toggleRole);



export default router;
