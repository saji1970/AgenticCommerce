import { Router } from 'express';
import type { Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';

const router: RouterType = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
