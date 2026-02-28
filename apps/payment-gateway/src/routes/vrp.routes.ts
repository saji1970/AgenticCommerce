import { Router } from 'express';
import { vrpConsentController } from '../controllers/vrp-consent.controller';
import { authenticateJWT, authenticateApiKey, authenticateAny } from '../middleware/auth';

const router = Router();

// User endpoints (JWT auth)
router.post('/consents', authenticateJWT, vrpConsentController.createConsent);
router.get('/consents/user/:userId', authenticateJWT, vrpConsentController.getUserConsents);
router.get('/consents/:id', authenticateJWT, vrpConsentController.getConsentById);
router.post('/consents/:id/approve', authenticateJWT, vrpConsentController.approveConsent);
router.post('/consents/:id/revoke', authenticateJWT, vrpConsentController.revokeConsent);
router.get('/consents/:id/usage', authenticateAny, vrpConsentController.getUsage);
router.get('/consents/:id/transactions', authenticateJWT, vrpConsentController.getConsentTransactions);

// Agent endpoint (API key auth)
router.post('/execute-payment', authenticateApiKey, vrpConsentController.executePayment);

// Token validation (any auth or none)
router.post('/validate-token', vrpConsentController.validateToken);

export default router;
