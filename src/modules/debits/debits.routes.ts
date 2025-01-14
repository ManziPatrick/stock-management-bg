// src/routes/debit.routes.ts

import { Router } from 'express';
import { DebitController } from './debits.controller';



import {authorizeRoles,verifyAuth} from '../../middlewares/verifyAuth';
const router = Router();
const debitController = new DebitController();

router.use(verifyAuth);

router
  .route('/')
  .get(debitController.getAllDebits)
  .post( debitController.createDebit);

router
  .route('/:id')
  .get(debitController.getDebitById)
  .patch(debitController.updateDebit)
  .delete(debitController.deleteDebit);

router.get('/summary', debitController.getDebitSummary);

export const debitRoutes = router;