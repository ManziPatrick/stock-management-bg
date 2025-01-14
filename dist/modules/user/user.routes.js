"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controllers_1 = __importDefault(require("./user.controllers"));
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const user_validator_1 = __importDefault(require("./user.validator"));
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const userRoutes = (0, express_1.Router)();
// Auth routes
userRoutes.post('/register', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.registerSchema), user_controllers_1.default.createUser);
userRoutes.post('/login', (0, validateRequest_1.default)(user_validator_1.default.loginSchema), user_controllers_1.default.login);
userRoutes.delete('/user/:id', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.deleteUser);
// Profile routes
userRoutes.get('/self', verifyAuth_1.verifyAuth, user_controllers_1.default.getSelf);
userRoutes.patch('/', verifyAuth_1.verifyAuth, (0, validateRequest_1.default)(user_validator_1.default.updatedProfileSchema), user_controllers_1.default.updateProfile);
userRoutes.post('/change-password', verifyAuth_1.verifyAuth, (0, validateRequest_1.default)(user_validator_1.default.changePasswordSchema), user_controllers_1.default.changePassword);
userRoutes.delete('/users/:id', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.deleteUser);
userRoutes.post('/register', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.registerSchema), user_controllers_1.default.createUser);
// Admin management routes
userRoutes.post('/create', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.createUserSchema), user_controllers_1.default.createUser);
userRoutes.get('/all', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.getAllUsers);
userRoutes.patch('/role/:userId', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.updateUserRoleSchema), user_controllers_1.default.updateUserRole);
exports.default = userRoutes;
