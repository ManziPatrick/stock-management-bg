"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendResponse = (res, responses) => {
    return res.status(responses.statusCode).json({
        statusCode: responses.statusCode,
        success: responses.success,
        message: responses.message,
        meta: responses.meta,
        data: responses.data
    });
};
exports.default = sendResponse;
