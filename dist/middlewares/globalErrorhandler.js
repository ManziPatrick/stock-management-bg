"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
const zod_1 = require("zod");
const config_1 = __importDefault(require("../config"));
const zodErrorSanitize_1 = __importDefault(require("../errors/zodErrorSanitize"));
const validationError_1 = __importDefault(require("../errors/validationError"));
const castError_1 = __importDefault(require("../errors/castError"));
const handleCustomError_1 = __importDefault(require("../errors/handleCustomError"));
const customError_1 = __importDefault(require("../errors/customError"));
const http_status_1 = __importDefault(require("http-status"));
const globalErrorHandler = (err, _req, res, _next) => {
    const errorResponse = {
        success: false,
        statusCode: 500,
        message: 'Internal Server Error!',
        errors: {},
        stack: config_1.default.nodeEnv === 'dev' ? err.stack : null
    };
    // console.log(err);
    if (err instanceof zod_1.ZodError) {
        const errors = (0, zodErrorSanitize_1.default)(err);
        errorResponse.statusCode = http_status_1.default.BAD_REQUEST;
        errorResponse.message = 'Validation Failed!';
        errorResponse.errors = errors;
    }
    else if ((err === null || err === void 0 ? void 0 : err.name) === 'ValidationError') {
        const errors = (0, validationError_1.default)(err);
        errorResponse.statusCode = http_status_1.default.BAD_REQUEST;
        errorResponse.message = 'Validation Failed!';
        errorResponse.errors = errors;
    }
    else if ((err === null || err === void 0 ? void 0 : err.name) === 'CastError') {
        const errors = (0, castError_1.default)();
        errorResponse.statusCode = http_status_1.default.BAD_REQUEST;
        errorResponse.message = 'Cast Error!';
        errorResponse.errors = errors;
    }
    else if (err instanceof customError_1.default) {
        const errors = (0, handleCustomError_1.default)(err);
        errorResponse.statusCode = err.statusCode;
        errorResponse.message = err.message;
        errorResponse.errors = errors;
    }
    else if ((err === null || err === void 0 ? void 0 : err.code) === 11000) {
        const [key, value] = Object.entries(err.keyValue)[0];
        errorResponse.statusCode = http_status_1.default.CONFLICT;
        errorResponse.message = 'Duplicate Entities!';
        errorResponse.errors = { [key]: `${value} is Already Exists!` };
    }
    return res.status(errorResponse.statusCode).json(errorResponse);
};
exports.default = globalErrorHandler;
