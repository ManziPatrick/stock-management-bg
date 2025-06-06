"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const sale_validator_1 = __importDefault(require("./sale.validator"));
const sale_controllers_1 = __importDefault(require("./sale.controllers"));
const saleRoutes = (0, express_1.Router)();
saleRoutes.use(verifyAuth_1.verifyAuth);
// Statistics routes
saleRoutes.get('/days', sale_controllers_1.default.readAllDaily);
saleRoutes.get('/years', sale_controllers_1.default.readAllYearly);
saleRoutes.get('/months', sale_controllers_1.default.readAllMonthly);
saleRoutes.get('/weeks', sale_controllers_1.default.readAllWeekly);
saleRoutes.get('/credit', sale_controllers_1.default.getTotalCredit);
// CRUD routes
saleRoutes.post('/', (0, validateRequest_1.default)(sale_validator_1.default.createSchema), sale_controllers_1.default.create);
saleRoutes.get('/', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'KEEPER', 'USER'), sale_controllers_1.default.readAll);
saleRoutes.get('/collection', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'KEEPER', 'USER'), sale_controllers_1.default.readAllInventoryStatus);
// Status and collection management routes
saleRoutes.patch('/:id/status', (0, verifyAuth_1.authorizeRoles)('ACCOUNTANT', 'SUPER_ADMIN'), sale_controllers_1.default.updateStatus);
saleRoutes.patch('/:id/collection', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'KEEPER', 'ACCOUNTANT', 'SUPER_ADMIN'), sale_controllers_1.default.markProductsCollected);
// Individual sale operations
saleRoutes.get('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'KEEPER', 'USER'), sale_controllers_1.default.readSingle);
saleRoutes.patch('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), (0, validateRequest_1.default)(sale_validator_1.default.updateSchema), sale_controllers_1.default.update);
saleRoutes.delete('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'), sale_controllers_1.default.delete);
exports.default = saleRoutes;
