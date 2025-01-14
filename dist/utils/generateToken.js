"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_1.default.jwt_secret, { expiresIn: '2d' });
};
exports.default = generateToken;
