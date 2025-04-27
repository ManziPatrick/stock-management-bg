"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const brand_validator_1 = __importDefault(require("./brand.validator"));
const brand_controllers_1 = __importDefault(require("./brand.controllers"));
const brandRoutes = (0, express_1.Router)();
brandRoutes.use(verifyAuth_1.verifyAuth);
brandRoutes.post('/', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(brand_validator_1.default.createSchema), brand_controllers_1.default.create);
brandRoutes.get('/', brand_controllers_1.default.getAll);
brandRoutes.delete('/:id', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), brand_controllers_1.default.delete);
brandRoutes.patch('/:id', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(brand_validator_1.default.updateSchema), brand_controllers_1.default.create);
exports.default = brandRoutes;
