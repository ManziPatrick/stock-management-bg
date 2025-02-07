import { Router } from 'express';
import { CreditController } from './credit.controller';
import { authorizeRoles, verifyAuth } from '../../middlewares/verifyAuth';

const router = Router();
const creditController = new CreditController();

router.use(verifyAuth);

router
  .route('/')
  .get(creditController.getAllCredits)
  .post(creditController.createCredit);

router
  .route('/:id')
  .get(creditController.getCreditById)
  .patch(creditController.updateCredit)
  .delete(creditController.deleteCredit);

router.get('/summary', creditController.getCreditSummary);

export const creditRoutes = router;