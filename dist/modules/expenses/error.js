"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(statusCode, message, errors = {}, stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.ApiError = ApiError;
const globalErrorHandler = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.success = error.success || false;
    error.message = error.message || 'Internal Server Error!';
    error.errors = error.errors || {};
    res.status(error.statusCode).json({
        success: error.success,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors,
        stack: process.env.NODE_ENV === 'development' ? error.stack : null
    });
};
exports.globalErrorHandler = globalErrorHandler;
