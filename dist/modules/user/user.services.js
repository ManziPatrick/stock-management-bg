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
const customError_1 = __importDefault(require("../../errors/customError"));
const generateToken_1 = __importDefault(require("../../utils/generateToken"));
const user_model_1 = __importDefault(require("./user.model"));
const verifyPassword_1 = __importDefault(require("../../utils/verifyPassword"));
const bcrypt_1 = __importDefault(require("bcrypt"));
class UserServices {
    constructor() {
        this.model = user_model_1.default;
    }
    // Get self profile
    getSelf(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findById(userId);
        });
    }
    deleteUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.findByIdAndDelete(userId);
            if (!result) {
                throw new Error('User not found');
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
            const user = yield this.model.create(payload);
            return user;
        });
    }
    // Get all users created by a specific admin or keeper
    getAllUsersByAdminOrKeeper(adminOrKeeperId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({ createdBy: adminOrKeeperId }).select('-password');
        });
    }
    getAllUsersByAdmin(adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find({ createdBy: adminId }).select('-password');
        });
    }
    // Get a single user by ID
    getUserById(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findById(userId);
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
    // Login existing user
    login(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.model.findOne({ email: payload.email }).select('+password');
            if (user) {
                yield (0, verifyPassword_1.default)(payload.password, user.password);
                const token = (0, generateToken_1.default)({ _id: user._id, email: user.email, role: user.role });
                return { token, role: user.role };
            }
            else {
                throw new customError_1.default(http_status_1.default.BAD_REQUEST, 'Wrong Credentials');
            }
        });
    }
    // Update user profile
    updateProfile(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.findByIdAndUpdate(id, payload);
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
                throw new customError_1.default(400, 'Old Password does not match!');
            }
            const hashedPassword = yield bcrypt_1.default.hash(payload.newPassword, 10);
            const updatedUser = yield this.model.findByIdAndUpdate(userId, { password: hashedPassword });
            return updatedUser;
        });
    }
}
const userServices = new UserServices();
exports.default = userServices;
