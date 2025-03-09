"use strict";
//@ts-nocheck
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
const customError_1 = __importDefault(require("../../errors/customError"));
const http_status_1 = __importDefault(require("http-status"));
const generateToken_1 = __importDefault(require("../../utils/generateToken"));
const user_model_1 = __importDefault(require("./user.model"));
const verifyPassword_1 = __importDefault(require("../../utils/verifyPassword"));
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserServices {
    constructor() {
        this.model = user_model_1.default;
    }
    // Get self profile with createdBy populated
    getSelf(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findById(userId).populate('createdBy', 'name email role');
        });
    }
    // Delete user
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.findByIdAndDelete(userId);
            if (!result) {
                throw new customError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
            }
            return {
                message: 'User deleted successfully',
                user: result,
            };
        });
    }
    // Register new user
    createUser(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const userExist = yield this.model.findOne({ email: payload.email });
            if (userExist) {
                throw new customError_1.default(http_status_1.default.BAD_REQUEST, 'User already exists with this email');
            }
            // Create the user
            const user = yield this.model.create(payload);
            return user;
        });
    }
    // Create owner/admin account with business info
    createOwnerAccount(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const userExist = yield this.model.findOne({ email: payload.email });
            if (userExist) {
                throw new customError_1.default(http_status_1.default.BAD_REQUEST, 'User already exists with this email');
            }
            const user = yield this.model.create(payload);
            return user;
        });
    }
    // Get all users for super admin with createdBy details
    getAllUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find().select('-password').populate('createdBy', 'name email role');
        });
    }
    // Get all users created by a specific admin
    getAllUsersByAdmin(adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({ createdBy: adminId }).select('-password').populate('createdBy', 'name email role');
        });
    }
    // Get users by business name
    getUsersByBusinessName(businessName) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({ 'businessInfo.businessName': businessName })
                .select('-password')
                .populate('createdBy', 'name email role');
        });
    }
    // Get a single user by ID with createdBy details
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findById(userId).populate('createdBy', 'name email role');
            if (!user) {
                throw new customError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
            }
            return user;
        });
    }
    // Update user role
    updateUserRole(userId, role) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findById(userId);
            if (!user) {
                throw new customError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
            }
            return this.model.findByIdAndUpdate(userId, { role }, { new: true });
        });
    }
    // Login existing user with createdBy details
    login(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findOne({ email: payload.email }).select('+password').populate('createdBy', 'name email role');
            if (!user) {
                throw new customError_1.default(http_status_1.default.BAD_REQUEST, 'Wrong Credentials');
            }
            yield (0, verifyPassword_1.default)(payload.password, user.password);
            // Generate token including createdBy details
            const token = (0, generateToken_1.default)({
                _id: user._id,
                email: user.email,
                role: user.role,
                businessInfo: user.businessInfo,
                createdBy: user.createdBy ? { _id: user.createdBy._id, name: user.createdBy.name, email: user.createdBy.email, role: user.createdBy.role } : null,
            });
            return {
                token,
                role: user.role,
                businessInfo: user.businessInfo,
                createdBy: user.createdBy,
            };
        });
    }
    // Update user profile
    updateProfile(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findByIdAndUpdate(id, payload, { new: true }).populate('createdBy', 'name email role');
        });
    }
    // Change password
    changePassword(userId, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findById(userId).select('+password');
            if (!user)
                throw new customError_1.default(http_status_1.default.NOT_FOUND, 'User not found');
            const matchedPassword = yield bcrypt_1.default.compare(payload.oldPassword, user.password);
            if (!matchedPassword) {
                throw new customError_1.default(http_status_1.default.BAD_REQUEST, 'Old Password does not match!');
            }
            const hashedPassword = yield bcrypt_1.default.hash(payload.newPassword, 10);
            const updatedUser = yield this.model.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
            return updatedUser;
        });
    }
}
const userServices = new UserServices();
exports.default = userServices;
