import { Router } from 'express';
import * as expenseController from './expenseController';
import * as pettyCashController from './pettyCashController';
import { verifyAuth, authorizeRoles } from '../../middlewares/verifyAuth';

const router = Router();

// Expense routes
router.get(
  '/',
  verifyAuth,
  expenseController.getExpenses
);

router.post(
  '/',
  verifyAuth,
  authorizeRoles('ADMIN', 'KEEPER', 'ACCOUNTANT','SUPER_ADMIN'),
  expenseController.addExpense
);

router.delete(
  '/:id',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  expenseController.removeExpense
);

// Petty Cash routes - restricted to ADMIN and ACCOUNTANT roles
router.get(
  '/',
  verifyAuth,
  expenseController.getExpenses
);

router.post(
  '/',
  verifyAuth,
  authorizeRoles('ADMIN', 'KEEPER', 'ACCOUNTANT','SUPER_ADMIN'),
  expenseController.addExpense
);

router.get(
  '/petty-cash/transactions',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  pettyCashController.getAllTransactions
);

router.delete(
  '/:id',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  expenseController.removeExpense
);

// Petty Cash routes - restricted to ADMIN and ACCOUNTANT roles
router.get(
  '/petty-cash',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  pettyCashController.getPettyCash
);

router.post(
  '/petty-cash/initialize',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  pettyCashController.initializePettyCashHandler
);

router.post(
  '/petty-cash/top-up',
  verifyAuth,
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'),
  pettyCashController.topUpPettyCash
);


export default router;