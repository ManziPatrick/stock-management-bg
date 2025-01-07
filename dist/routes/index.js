"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_routes_1 = __importDefault(require("../modules/user/user.routes"));
const product_routes_1 = __importDefault(require("../modules/product/product.routes"));
const sale_routes_1 = __importDefault(require("../modules/sale/sale.routes"));
const category_routes_1 = __importDefault(require("../modules/category/category.routes"));
const brand_routes_1 = __importDefault(require("../modules/brand/brand.routes"));
const seller_routes_1 = __importDefault(require("../modules/seller/seller.routes"));
const purchase_routes_1 = __importDefault(require("../modules/purchase/purchase.routes"));
const expenseRoutes_1 = __importDefault(require("../modules/expenses/expenseRoutes"));
const rootRouter = (0, express_1.Router)();
rootRouter.use('/users', user_routes_1.default);
rootRouter.use('/products', product_routes_1.default);
rootRouter.use('/sales', sale_routes_1.default);
rootRouter.use('/categories', category_routes_1.default);
rootRouter.use('/brands', brand_routes_1.default);
rootRouter.use('/sellers', seller_routes_1.default);
rootRouter.use('/expenses', expenseRoutes_1.default);
rootRouter.use('/purchases', purchase_routes_1.default);
exports.default = rootRouter;
