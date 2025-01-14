"use strict";
// src/routes/debit.routes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.debitRoutes = void 0;
const express_1 = require("express");
const debits_controller_1 = require("./debits.controller");
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const router = (0, express_1.Router)();
const debitController = new debits_controller_1.DebitController();
router.use(verifyAuth_1.verifyAuth);
router
    .route('/')
    .get(debitController.getAllDebits)
    .post(debitController.createDebit);
router
    .route('/:id')
    .get(debitController.getDebitById)
    .patch(debitController.updateDebit)
    .delete(debitController.deleteDebit);
router.get('/summary', debitController.getDebitSummary);
exports.debitRoutes = router;
