"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canSetOriginalPrice = exports.applyPriceFilter = exports.filterPriceFields = void 0;
/**
 * Middleware to filter price fields based on user role
 * Only ADMIN and SUPER_ADMIN can see the original price
 * All other users only see the default_price
 */
const filterPriceFields = (data, userRole) => {
    if (!data)
        return data;
    const canSeeOriginalPrice = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    // Handle single product object
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.price !== undefined && !canSeeOriginalPrice) {
            const { price } = data, filteredData = __rest(data, ["price"]);
            return filteredData;
        }
        return data;
    }
    // Handle array of products
    if (Array.isArray(data)) {
        return data.map(item => {
            if (item && typeof item === 'object' && item.price !== undefined && !canSeeOriginalPrice) {
                const { price } = item, filteredItem = __rest(item, ["price"]);
                return filteredItem;
            }
            return item;
        });
    }
    return data;
};
exports.filterPriceFields = filterPriceFields;
/**
 * Express middleware to filter response data based on user role
 */
const applyPriceFilter = (req, res, next) => {
    const originalJson = res.json;
    res.json = function (body) {
        var _a;
        if (body && body.data) {
            body.data = (0, exports.filterPriceFields)(body.data, (_a = req.user) === null || _a === void 0 ? void 0 : _a.role);
        }
        return originalJson.call(this, body);
    };
    next();
};
exports.applyPriceFilter = applyPriceFilter;
/**
 * Check if user can set original price
 */
const canSetOriginalPrice = (userRole) => {
    return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
};
exports.canSetOriginalPrice = canSetOriginalPrice;
