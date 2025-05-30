"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-nocheck
const http_status_1 = __importDefault(require("http-status"));
const asyncHandler_1 = __importDefault(require("../../lib/asyncHandler"));
const sendResponse_1 = __importDefault(require("../../lib/sendResponse"));
const user_services_1 = __importDefault(require("./user.services"));
const customError_1 = __importDefault(require("../../errors/customError"));
class UserControllers {
    constructor() {
        this.services = user_services_1.default;
        // Get self profile
        this.getSelf = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.getSelf(req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User profile retrieved successfully!',
                data: result,
            });
        }));
        // Super admin creates an owner/admin account
        this.createOwnerAccount = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only super admins can create owner accounts');
            }
            const newOwner = Object.assign(Object.assign({}, req.body), { role: 'ADMIN', createdBy: req.user._id });
            const result = yield this.services.createOwnerAccount(newOwner);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.CREATED,
                message: 'Owner account created successfully!',
                data: result,
            });
        }));
        // Get all users (super admin only)
        this.getAllUsersForSuperAdmin = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only super admins can view all users');
            }
            const result = yield this.services.getAllUsers();
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'All users retrieved successfully!',
                data: result,
            });
        }));
        // Get users by business name
        this.getUsersByBusinessName = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only super admins can filter users by business');
            }
            const { businessName } = req.params;
            const result = yield this.services.getUsersByBusinessName(businessName);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Users retrieved successfully!',
                data: result,
            });
        }));
        // Create user
        this.createUser = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            // Super admin can create any type of user
            if (req.user.role === 'SUPER_ADMIN') {
                const newUser = Object.assign(Object.assign({}, req.body), { createdBy: req.user._id });
                const result = yield this.services.createUser(newUser);
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.CREATED,
                    message: 'User created successfully!',
                    data: result,
                });
                return;
            }
            // Admin can only create admin (of same company), keeper, accountant or user
            if (req.user.role === 'ADMIN') {
                // Get admin's business info
                const admin = yield this.services.getSelf(req.user._id);
                // Admin can't create SUPER_ADMIN
                if (req.body.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Admins cannot create super admin accounts');
                }
                // If creating another admin, they must be in same business
                if (req.body.role === 'ADMIN' && admin && admin.businessInfo) {
                    req.body.businessInfo = admin.businessInfo;
                }
                const newUser = Object.assign(Object.assign({}, req.body), { createdBy: req.user._id });
                const result = yield this.services.createUser(newUser);
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.CREATED,
                    message: 'User created successfully!',
                    data: result,
                });
                return;
            }
            // Other roles can't create users
            throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins and super admins can create users');
        }));
        // Get all users created by the admin
        this.getAllUsers = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can view all users');
            }
            const result = yield this.services.getAllUsersByAdmin(req.user._id); // Filter by admin ID
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Users retrieved successfully!',
                data: result,
            });
        }));
        // Update user role (admin only for their users)
        this.updateUserRole = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can update user roles');
            }
            // Super admin can update any user role except another SUPER_ADMIN
            if (req.user.role === 'SUPER_ADMIN') {
                const user = yield this.services.getUserById(req.params.userId);
                // Can't change another super admin's role
                if (user.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot change super admin role');
                }
                const result = yield this.services.updateUserRole(req.params.userId, req.body.role);
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.OK,
                    message: 'User role updated successfully!',
                    data: result,
                });
                return;
            }
            // Regular admin can only update their created users
            const user = yield this.services.getUserById(req.params.userId);
            // if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
            //   throw new CustomError(httpStatus.FORBIDDEN, 'You can only update roles for users you created');
            // }
            // Regular admin can't set someone to SUPER_ADMIN
            if (req.body.role === 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot set user to super admin role');
            }
            const result = yield this.services.updateUserRole(req.params.userId, req.body.role);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User role updated successfully!',
                data: result,
            });
        }));
        // Delete user 
        this.deleteUser = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            // Super admin can delete any user except another super admin
            if (req.user.role === 'SUPER_ADMIN') {
                const user = yield this.services.getUserById(req.params.id);
                if (user.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot delete super admin accounts');
                }
            }
            // Regular admin can only delete their created users
            else if (req.user.role === 'ADMIN') {
                const user = yield this.services.getUserById(req.params.id);
                // if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
                //   throw new CustomError(httpStatus.FORBIDDEN, 'You can only delete users you created');
                // }
                if (user.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot delete super admin accounts');
                }
            }
            // Other roles can't delete users
            else {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'You do not have permission to delete users');
            }
            yield this.services.deleteUser(req.params.id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User deleted successfully!',
            });
        }));
        // Login into registered account
        this.login = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.login(req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User logged in successfully!',
                data: result,
            });
        }));
        // Update profile
        this.updateProfile = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.updateProfile(req.user._id, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User profile updated successfully!',
                data: result,
            });
        }));
        // Change password
        this.changePassword = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.changePassword(req.user._id, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Password changed successfully!',
                data: result,
            });
        }));
        // NEW: Admin updates user information
        this.adminUpdateUser = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { userId } = req.params;
            // Check permissions
            if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can edit users');
            }
            // Super admin can edit any user except other super admins
            if (req.user.role === 'SUPER_ADMIN') {
                const user = yield this.services.getUserById(userId);
                if (user.role === 'SUPER_ADMIN' && userId !== req.user._id.toString()) {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot edit other super admin accounts');
                }
            }
            // Admin can only edit users they created
            else if (req.user.role === 'ADMIN') {
                const user = yield this.services.getUserById(userId);
                // if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
                //   throw new CustomError(httpStatus.FORBIDDEN, 'You can only edit users you created');
                // }
                if (user.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot edit super admin accounts');
                }
            }
            const result = yield this.services.adminUpdateUser(userId, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User information updated successfully!',
                data: result,
            });
        }));
        // NEW: Admin updates user's password
        this.adminUpdatePassword = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { userId } = req.params;
            const { password } = req.body;
            // Check permissions
            if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can change user passwords');
            }
            // Super admin can edit any user's password except other super admins
            if (req.user.role === 'SUPER_ADMIN') {
                const user = yield this.services.getUserById(userId);
                if (user.role === 'SUPER_ADMIN' && userId !== req.user._id.toString()) {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot change other super admin passwords');
                }
            }
            // Admin can only change passwords for users they created
            else if (req.user.role === 'ADMIN') {
                const user = yield this.services.getUserById(userId);
                // if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
                //   throw new CustomError(httpStatus.FORBIDDEN, 'You can only change passwords for users you created');
                // }
                if (user.role === 'SUPER_ADMIN') {
                    throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Cannot change super admin passwords');
                }
            }
            const result = yield this.services.adminUpdatePassword(userId, password);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User password updated successfully!',
            });
        }));
    }
}
const userControllers = new UserControllers();
exports.default = userControllers;
