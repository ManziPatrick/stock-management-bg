"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const handleCustomError = (err) => {
    let errorResponse = {};
    if (err.type === 'WrongCredentials') {
        errorResponse = {
            email: {
                path: 'email',
                message: 'Wrong Credentials'
            },
            password: {
                path: 'password',
                message: 'Wrong Credentials'
            }
        };
    }
    if (err.type === 'Unauthorize') {
        errorResponse = { isAuthenticated: false };
    }
    if (err.type === 'NOT_FOUND') {
        errorResponse = {};
    }
    return errorResponse;
};
exports.default = handleCustomError;
