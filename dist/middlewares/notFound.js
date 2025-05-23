"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const notFound = (_req, res) => {
    return res.status(404).json({
        success: false,
        statusCode: 404,
        message: '404! Route Not found.'
    });
};
exports.default = notFound;
