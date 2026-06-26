import { Router } from 'express';
import {
    getStats, getUsers, deleteUser, toggleRole, getAdminAIInsights, sendBroadcast, getLatestBroadcast,
    getAuditLogs, getAnalytics, clearCache, exportDatabase, runIntegrityCheck,
    getUserDetails, updateUser, resetUserPassword, getHealth, getBroadcasts, revokeBroadcast,
    sendUserEmail, getEmailStatus
} from '../controllers/admin.controller';
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

// Novas rotas funcionais — dashboard / operações
router.get('/audit-logs', getAuditLogs);
router.get('/analytics', getAnalytics);
router.post('/cache/clear', clearCache);
router.get('/export', exportDatabase);
router.get('/integrity', runIntegrityCheck);
router.get('/health', getHealth);

// Gestão de usuários
router.get('/users/:id/details', getUserDetails);
router.patch('/users/:id', updateUser);
router.post('/users/:id/reset-password', resetUserPassword);

// Comunicados (broadcast)
router.get('/broadcasts', getBroadcasts);
router.patch('/broadcasts/:id/revoke', revokeBroadcast);

// E-mail (comunicados / atualizações / chamadas)
router.get('/email/status', getEmailStatus);
router.post('/email', sendUserEmail);

export default router;
