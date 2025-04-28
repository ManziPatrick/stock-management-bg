"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const zodErrorSanitize = (err) => {
    const errors = err.issues.reduce((acc, cur) => {
        const path = cur.path[cur.path.length - 1];
        acc[path] = `${path} is ${cur.message}!`;
        return acc;
    }, {});
    return errors;
};
exports.default = zodErrorSanitize;
