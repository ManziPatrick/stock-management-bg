"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const seller_validator_1 = __importDefault(require("./seller.validator"));
const seller_controllers_1 = __importDefault(require("./seller.controllers"));
const sellerRoutes = (0, express_1.Router)();
sellerRoutes.use(verifyAuth_1.verifyAuth);
sellerRoutes.post('/', (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(seller_validator_1.default.createSchema), seller_controllers_1.default.create);
sellerRoutes.get('/', (0, verifyAuth_1.authorizeRoles)('ADMIN'), seller_controllers_1.default.readAll);
sellerRoutes.patch('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(seller_validator_1.default.updateSchema), seller_controllers_1.default.update);
sellerRoutes.get('/:id', seller_controllers_1.default.readSingle);
sellerRoutes.delete('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN'), seller_controllers_1.default.delete);
exports.default = sellerRoutes;
