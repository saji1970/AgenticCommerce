import { Router } from 'express';
import { adminVrpController } from '../controllers/admin-vrp.controller';

const router = Router();

// Admin routes - auth is handled by the upstream proxy (backend or mandate-service)
// These endpoints are not exposed publicly, only reached via internal proxy

router.get('/vrp-consents', adminVrpController.listConsents);
router.get('/vrp-consents/:id', adminVrpController.getConsentDetail);
router.get('/vrp-consents/:id/transactions', adminVrpController.getConsentTransactions);
router.post('/vrp-consents/:id/suspend', adminVrpController.suspendConsent);
router.post('/vrp-consents/:id/revoke', adminVrpController.revokeConsent);
router.get('/vrp-transactions', adminVrpController.listAllTransactions);

export default router;
