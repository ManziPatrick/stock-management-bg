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
        // Register a new account by admin
        this.createUser = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            if (req.user.role !== 'ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can create users');
            }
            const newUser = Object.assign(Object.assign({}, req.body), { createdBy: req.user._id }); // Add admin ID
            const result = yield this.services.createUser(newUser);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.CREATED,
                message: 'User created successfully!',
                data: result,
            });
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
            if (req.user.role !== 'ADMIN') {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Only admins can update user roles');
            }
            // Ensure admin can only update their created users
            const user = yield this.services.getUserById(req.params.userId);
            if (!user.createdBy || user.createdBy.toString() !== req.user._id.toString()) {
                throw new customError_1.default(http_status_1.default.FORBIDDEN, 'You can only update roles for users you created');
            }
            const result = yield this.services.updateUserRole(req.params.userId, req.body.role);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'User role updated successfully!',
                data: result,
            });
        }));
        //delect user 
        this.deleteUser = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
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
    }
}
const userControllers = new UserControllers();
exports.default = userControllers;
