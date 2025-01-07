import { Router } from 'express';
import * as expenseController from './expenseController';
import { verifyAuth, authorizeRoles } from '../../middlewares/verifyAuth';

const router = Router();

// Define routes with proper middleware and controller functions
router.get(
  '/',
  verifyAuth,
  expenseController.getExpenses
);

router.get(
    '/all',
    verifyAuth,
    expenseController.getTotalExpenses
  );
  
router.post(
  '/',
  verifyAuth,
  authorizeRoles('ADMIN', 'KEEPER'),
  expenseController.addExpense
);

router.delete(
  '/:id',
  verifyAuth,
  authorizeRoles('ADMIN'),
  expenseController.removeExpense
);

export default router;