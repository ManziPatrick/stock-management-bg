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
    .post(creditController.createCredit);
router
    .route('/:id')
    .get(creditController.getCreditById)
    .patch(creditController.updateCredit)
    .delete(creditController.deleteCredit);
router.get('/summary', creditController.getCreditSummary);
exports.creditRoutes = router;
