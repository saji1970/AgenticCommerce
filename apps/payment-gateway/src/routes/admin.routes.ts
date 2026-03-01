import { Router } from 'express';
import { adminVrpController } from '../controllers/admin-vrp.controller';
import { authenticateAny } from '../middleware/auth';

const router = Router();

// Admin routes - accept regular JWT (forwarded by backend proxy) or API key
router.use(authenticateAny);

router.get('/vrp-consents', adminVrpController.listConsents);
router.get('/vrp-consents/:id', adminVrpController.getConsentDetail);
router.get('/vrp-consents/:id/transactions', adminVrpController.getConsentTransactions);
router.post('/vrp-consents/:id/suspend', adminVrpController.suspendConsent);
router.post('/vrp-consents/:id/revoke', adminVrpController.revokeConsent);
router.get('/vrp-transactions', adminVrpController.listAllTransactions);

export default router;
