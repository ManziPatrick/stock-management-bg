"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.verifyAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const customError_1 = __importDefault(require("../errors/customError"));
const http_status_1 = __importDefault(require("http-status"));
const config_1 = __importDefault(require("../config"));
const verifyAuth = (req, _res, next) => {
    const bearerToken = req.header('Authorization');
    console.log("Request Headers:", req.headers);
    console.log("Authorization Header:", bearerToken);
    if (!bearerToken) {
        console.warn("Authorization header is missing.");
        throw new customError_1.default(http_status_1.default.UNAUTHORIZED, 'Unauthorized! Please login', 'Unauthorized');
    }
    try {
        const token = bearerToken.replace('Bearer ', '');
        console.log("Extracted Token:", token);
        const decode = jsonwebtoken_1.default.verify(token, config_1.default.jwt_secret);
        console.log("Decoded Payload:", decode);
        req.user = {
            _id: decode === null || decode === void 0 ? void 0 : decode._id,
            name: decode === null || decode === void 0 ? void 0 : decode.name,
            email: decode === null || decode === void 0 ? void 0 : decode.email,
            title: decode === null || decode === void 0 ? void 0 : decode.title,
            description: decode === null || decode === void 0 ? void 0 : decode.description,
            avatar: decode === null || decode === void 0 ? void 0 : decode.avatar,
            role: (decode === null || decode === void 0 ? void 0 : decode.role) || 'USER',
            status: decode === null || decode === void 0 ? void 0 : decode.status,
            address: decode === null || decode === void 0 ? void 0 : decode.address,
            phone: decode === null || decode === void 0 ? void 0 : decode.phone,
            city: decode === null || decode === void 0 ? void 0 : decode.city,
            country: decode === null || decode === void 0 ? void 0 : decode.country,
            instagram: decode === null || decode === void 0 ? void 0 : decode.instagram,
            businessInfo: decode === null || decode === void 0 ? void 0 : decode.businessInfo,
            createdBy: decode === null || decode === void 0 ? void 0 : decode.createdBy,
        };
        console.log("User Info Added to Request:", req.user);
        next();
    }
    catch (error) {
        console.error("JWT Verification Failed:", error);
        throw new customError_1.default(http_status_1.default.UNAUTHORIZED, 'Unauthorized! Please login', 'Unauthorized');
    }
};
exports.verifyAuth = verifyAuth;
const authorizeRoles = (...roles) => {
    return (req, _res, next) => {
        var _a;
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        console.log("Current Roles Allowed:", roles);
        console.log("User Role from Request:", userRole);
        console.log("hhhhhhh", userRole);
        if (userRole && roles.includes(userRole)) {
            next();
        }
        else {
            throw new customError_1.default(http_status_1.default.FORBIDDEN, 'Access Denied! Insufficient permissions', 'Forbidden');
        }
    };
};
exports.authorizeRoles = authorizeRoles;
