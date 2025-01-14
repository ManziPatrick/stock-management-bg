"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CustomError extends Error {
    constructor(statusCode, message, type = '', stack = '') {
        super(message);
        this.type = '';
        this.statusCode = statusCode;
        this.type = type;
        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
exports.default = CustomError;
