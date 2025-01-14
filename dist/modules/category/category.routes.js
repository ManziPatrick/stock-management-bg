"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const category_validator_1 = __importDefault(require("./category.validator"));
const category_controllers_1 = __importDefault(require("./category.controllers"));
const categoryRoutes = (0, express_1.Router)();
categoryRoutes.use(verifyAuth_1.verifyAuth);
categoryRoutes.post('/', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(category_validator_1.default.createSchema), category_controllers_1.default.create);
categoryRoutes.get('/', category_controllers_1.default.getAll);
categoryRoutes.delete('/:id', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), category_controllers_1.default.delete);
categoryRoutes.patch('/:id', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(category_validator_1.default.updateSchema), category_controllers_1.default.create);
exports.default = categoryRoutes;
