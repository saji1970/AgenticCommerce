import { Router } from 'express';
import type { Router as RouterType } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import productRoutes from './product.routes';
import cartRoutes from './cart.routes';
import paymentRoutes from './payment.routes';
import mandateRoutes from './mandate.routes';
import acpRoutes from './agentic-commerce.routes';
import merchantRoutes from './merchant.routes';
import ap2GatewayRoutes from './ap2-gateway.routes';
import adminRoutes from './admin.routes';

const router: RouterType = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentRoutes);
router.use('/mandates', mandateRoutes);
router.use('/acp', acpRoutes);

// AP2 (Agentic Protocol 2) Routes
router.use('/merchants', merchantRoutes);
router.use('/ap2/gateway', ap2GatewayRoutes);

// Admin Routes
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
