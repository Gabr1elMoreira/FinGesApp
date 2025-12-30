import { Router } from 'express';
import { updateSettings, updateProfile } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.put('/settings', updateSettings);
router.put('/profile', updateProfile);

export default router;
