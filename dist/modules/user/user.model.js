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
const mongoose_1 = require("mongoose");
const hashPassword_1 = __importDefault(require("../../utils/hashPassword"));
const userRole_1 = require("../../constant/userRole");
const userSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: 0 },
    title: { type: String },
    description: { type: String },
    avatar: { type: String },
    role: { type: String, enum: userRole_1.UserRole, default: 'USER' },
    status: { type: String, enum: userRole_1.UserStatus, default: 'ACTIVE' },
    address: { type: String },
    phone: { type: String },
    city: { type: String },
    country: { type: String },
    facebook: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    instagram: { type: String },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user', required: true }
}, { timestamps: true });
userSchema.pre('save', function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified('password')) {
            this.password = yield (0, hashPassword_1.default)(this.password);
        }
        next();
    });
});
const User = (0, mongoose_1.model)('user', userSchema);
exports.default = User;
