import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { SignatureController } from '../controllers/signature.controller';

const router: RouterType = Router();
const signatureController = new SignatureController();

// Public key management
router.post('/keys/register', signatureController.registerPublicKey);
router.get('/keys', signatureController.getUserPublicKeys);

// Signature management
router.post('/create', signatureController.createSignature);
router.post('/:id/verify', signatureController.verifySignature);
router.get('/mandate/:mandateId', signatureController.getSignatureByMandate);

export default router;
