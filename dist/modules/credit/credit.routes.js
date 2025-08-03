"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.creditRoutes = void 0;
const express_1 = require("express");
const credit_controller_1 = require("./credit.controller");
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const router = (0, express_1.Router)();
const creditController = new credit_controller_1.CreditController();
router.use(verifyAuth_1.verifyAuth);
router
    .route('/')
    .get(creditController.getAllCredits)
    .post((0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'), creditController.createCredit);
router.get('/summary', creditController.getCreditSummary);
router.get('/pending-deliveries', creditController.getPendingDeliveries);
router.get('/stock-summary/:productId', creditController.getStockSummary);
router.post('/verify-delivery', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN', 'SUPER_ADMIN'), creditController.verifyDelivery);
router
    .route('/:id')
    .get(creditController.getCreditById)
    .patch((0, verifyAuth_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN'), creditController.updateCredit)
    .delete((0, verifyAuth_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN'), creditController.deleteCredit);
router.post('/:id/payment', creditController.makePayment);
exports.creditRoutes = router;
