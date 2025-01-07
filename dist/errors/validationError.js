"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validationError = (error) => {
    const errRes = Object.keys(error.errors).reduce((acc, cur) => {
        acc[error.errors[cur].path] = error.errors[cur].message;
        return acc;
    }, {});
    return errRes;
};
exports.default = validationError;
