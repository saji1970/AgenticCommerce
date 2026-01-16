import { Router } from 'express';
import type { Router as RouterType } from 'express';
import { MerchantController } from '../controllers/merchant.controller';

const router: RouterType = Router();
const merchantController = new MerchantController();

// Merchant configuration routes
router.post('/', merchantController.createMerchant);
router.get('/', merchantController.getAllMerchants);
router.get('/:id', merchantController.getMerchant);
router.put('/:id', merchantController.updateMerchant);
router.delete('/:id', merchantController.deleteMerchant);

export default router;
