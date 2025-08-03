import { Router } from 'express';
import { CreditController } from './credit.controller';
import { authorizeRoles, verifyAuth } from '../../middlewares/verifyAuth';

const router = Router();
const creditController = new CreditController();

router.use(verifyAuth);

router
  .route('/')
  .get(creditController.getAllCredits)
  .post(authorizeRoles('KEEPER', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'), creditController.createCredit);

router.get('/summary', creditController.getCreditSummary);
router.get('/pending-deliveries', creditController.getPendingDeliveries);
router.get('/stock-summary/:productId', creditController.getStockSummary);

router.post('/verify-delivery', 
  authorizeRoles('KEEPER', 'ADMIN', 'SUPER_ADMIN'), 
  creditController.verifyDelivery
);

router
  .route('/:id')
  .get(creditController.getCreditById)
  .patch(authorizeRoles('ADMIN', 'SUPER_ADMIN'), creditController.updateCredit)
  .delete(authorizeRoles('ADMIN', 'SUPER_ADMIN'), creditController.deleteCredit);

router.post('/:id/payment', creditController.makePayment);

export const creditRoutes = router;