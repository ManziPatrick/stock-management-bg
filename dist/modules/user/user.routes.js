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
/**
 * --- SUPER ADMIN Routes ---
 */
userRoutes.post('/create-owner', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('SUPER_ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.createOwnerSchema), user_controllers_1.default.createOwnerAccount);
userRoutes.get('/all-users', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('SUPER_ADMIN'), user_controllers_1.default.getAllUsersForSuperAdmin);
userRoutes.get('/business/:businessName', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('SUPER_ADMIN'), user_controllers_1.default.getUsersByBusinessName);
/**
 * --- Auth Routes ---
 */
userRoutes.post('/register', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.registerSchema), user_controllers_1.default.createUser);
userRoutes.post('/login', (0, validateRequest_1.default)(user_validator_1.default.loginSchema), user_controllers_1.default.login);
userRoutes.delete('/user/:id', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.deleteUser);
/**
 * --- Profile Routes ---
 */
userRoutes.get('/self', verifyAuth_1.verifyAuth, user_controllers_1.default.getSelf);
userRoutes.patch('/', verifyAuth_1.verifyAuth, (0, validateRequest_1.default)(user_validator_1.default.updatedProfileSchema), user_controllers_1.default.updateProfile);
userRoutes.post('/change-password', verifyAuth_1.verifyAuth, (0, validateRequest_1.default)(user_validator_1.default.changePasswordSchema), user_controllers_1.default.changePassword);
// Duplicate delete route (for demonstration as provided; consider removing duplicates)
userRoutes.delete('/users/:id', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.deleteUser);
// Duplicate register route (as provided; consider consolidating if not needed)
userRoutes.post('/register', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.registerSchema), user_controllers_1.default.createUser);
/**
 * --- Admin Management Routes ---
 */
userRoutes.post('/create', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.createUserSchema), user_controllers_1.default.createUser);
userRoutes.get('/all', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), user_controllers_1.default.getAllUsers);
userRoutes.patch('/role/:userId', verifyAuth_1.verifyAuth, (0, verifyAuth_1.authorizeRoles)('ADMIN'), (0, validateRequest_1.default)(user_validator_1.default.updateUserRoleSchema), user_controllers_1.default.updateUserRole);
exports.default = userRoutes;
