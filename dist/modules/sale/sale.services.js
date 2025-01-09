"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const sortAndPaginate_pipeline_1 = __importDefault(require("../../lib/sortAndPaginate.pipeline"));
const baseServices_1 = __importDefault(require("../baseServices"));
const sale_model_1 = __importDefault(require("./sale.model"));
const product_model_1 = __importDefault(require("../product/product.model"));
const expenseModel_1 = require("../expenses/expenseModel");
const customError_1 = __importDefault(require("../../errors/customError"));
class SaleServices extends baseServices_1.default {
    constructor(model, modelName) {
        super(model, modelName);
    }
    calculateTotalStockRevenue() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield product_model_1.default.aggregate([
                {
                    $group: {
                        _id: '$size',
                        totalRevenue: { $sum: { $multiply: ['$price', '$stock'] } },
                        totalStock: { $sum: '$stock' },
                        averagePrice: { $avg: '$price' }
                    }
                },
                {
                    $sort: { _id: 1 }
                },
                {
                    $group: {
                        _id: null,
                        sizeWiseRevenue: { $push: '$$ROOT' },
                        totalOverallRevenue: { $sum: '$totalRevenue' },
                        totalOverallStock: { $sum: '$totalStock' },
                    }
                }
            ]);
        });
    }
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { quantity, SellingPrice, product: productId } = payload;
                payload.user = userId;
                const product = yield product_model_1.default.findById(productId);
                if (!product) {
                    throw new customError_1.default(404, 'Product not found');
                }
                payload.productPrice = product.price;
                payload.SellingPrice = SellingPrice || product.price;
                payload.totalPrice = payload.productPrice * quantity;
                if (quantity > product.stock) {
                    throw new customError_1.default(400, `${quantity} products are not available in stock!`);
                }
                const updatedProduct = yield product_model_1.default.findByIdAndUpdate(product._id, { $inc: { stock: -quantity } }, { new: true });
                if (!updatedProduct) {
                    throw new customError_1.default(400, 'Failed to update product stock');
                }
                const result = yield this.model.create(payload);
                // Calculate total revenue after sale
                const totalRevenue = yield this.calculateTotalStockRevenue();
                return {
                    sale: result,
                    totalRevenue: totalRevenue[0]
                };
            }
            catch (error) {
                console.error('Sale creation error:', error);
                throw new customError_1.default(400, 'Sale creation failed');
            }
        });
    }
    calculateExpenses(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const totalExpenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: { createdBy: new mongoose_1.Types.ObjectId(userId) },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' },
                    },
                },
            ]);
            return ((_a = totalExpenses[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
        });
    }
    readAll() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            const search = query.search ? query.search : '';
            const totalRevenue = yield this.calculateTotalStockRevenue();
            // Calculate sold products total
            const soldProductsTotal = yield this.model.aggregate([
                {
                    $match: {
                        $or: [
                            { productName: { $regex: search, $options: 'i' } },
                            { buyerName: { $regex: search, $options: 'i' } },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalQuantitySold: { $sum: '$quantity' },
                        totalSaleAmount: { $sum: '$totalPrice' },
                        totalSellingPrice: { $sum: '$SellingPrice' },
                        totalProductPrice: { $sum: '$productPrice' },
                        profit: {
                            $sum: {
                                $subtract: ['$SellingPrice', '$productPrice']
                            }
                        },
                        totalMarginProfit: {
                            $sum: {
                                $multiply: [
                                    '$quantity',
                                    { $subtract: ['$SellingPrice', '$productPrice'] }
                                ]
                            }
                        },
                    }
                }
            ]);
            const data = yield this.model.aggregate([
                {
                    $match: {
                        $or: [
                            { productName: { $regex: search, $options: 'i' } },
                            { buyerName: { $regex: search, $options: 'i' } },
                        ],
                    },
                },
                ...(0, sortAndPaginate_pipeline_1.default)(query),
            ]);
            const totalCount = yield this.model.countDocuments({
                $or: [
                    { productName: { $regex: search, $options: 'i' } },
                    { buyerName: { $regex: search, $options: 'i' } },
                ],
            });
            const summary = soldProductsTotal[0] || {
                totalQuantitySold: 0,
                totalSaleAmount: 0,
                totalSellingPrice: 0,
                totalProductPrice: 0,
                totalMarginProfit: 0,
                profit: 0
            };
            return {
                data,
                totalCount,
                totalRevenue: totalRevenue[0],
                summary
            };
        });
    }
    readAllDaily(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalExpenses = yield this.calculateExpenses(userId);
            const totalRevenue = yield this.calculateTotalStockRevenue();
            const dailyData = yield this.model.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        date: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: { day: { $dayOfMonth: '$date' }, month: { $month: '$date' }, year: { $year: '$date' } },
                        totalQuantity: { $sum: '$quantity' },
                        totalSellingPrice: { $sum: '$SellingPrice' },
                        totalProductPrice: { $sum: '$productPrice' },
                        totalPurchasedAmount: { $sum: '$productPrice' },
                        totalExpenses: { $first: totalExpenses },
                    },
                },
                {
                    $addFields: {
                        totalProfit: {
                            $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
                        }
                    },
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
                },
            ]);
            return {
                dailyData,
                totalRevenue: totalRevenue[0],
                totalPurchasedAmount: dailyData.reduce((sum, year) => sum + year.totalPurchasedAmount, 0),
            };
        });
    }
    readAllWeekly(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalExpenses = yield this.calculateExpenses(userId);
            const totalRevenue = yield this.calculateTotalStockRevenue();
            const weeklyData = yield this.model.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        date: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: { week: { $isoWeek: '$date' }, year: { $isoWeekYear: '$date' } },
                        totalQuantity: { $sum: '$quantity' },
                        totalSellingPrice: { $sum: '$SellingPrice' },
                        totalProductPrice: { $sum: '$productPrice' },
                        totalExpenses: { $first: totalExpenses },
                    },
                },
                {
                    $addFields: {
                        totalProfit: {
                            $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
                        }
                    },
                },
                {
                    $sort: { '_id.year': 1, '_id.week': 1 },
                },
            ]);
            return {
                weeklyData,
                totalRevenue: totalRevenue[0]
            };
        });
    }
    readById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.findById(id);
            if (!result) {
                throw new customError_1.default(404, 'Sale not found');
            }
            const totalRevenue = yield this.calculateTotalStockRevenue();
            return {
                sale: result,
                totalRevenue: totalRevenue[0]
            };
        });
    }
    readAllMonthly(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalExpenses = yield this.calculateExpenses(userId);
            const totalRevenue = yield this.calculateTotalStockRevenue();
            const monthlyData = yield this.model.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        date: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: { month: { $month: '$date' }, year: { $year: '$date' } },
                        totalQuantity: { $sum: '$quantity' },
                        totalSellingPrice: { $sum: '$SellingPrice' },
                        totalProductPrice: { $sum: '$productPrice' },
                        totalExpenses: { $first: totalExpenses },
                    },
                },
                {
                    $addFields: {
                        totalProfit: {
                            $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
                        }
                    },
                },
                {
                    $sort: { '_id.year': 1, '_id.month': 1 },
                },
            ]);
            return {
                monthlyData,
                totalRevenue: totalRevenue[0]
            };
        });
    }
    readAllYearly(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const totalExpenses = yield this.calculateExpenses(userId);
            const totalRevenue = yield this.calculateTotalStockRevenue();
            const yearlyData = yield this.model.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        date: { $exists: true, $ne: null },
                    },
                },
                {
                    $group: {
                        _id: { year: { $year: '$date' } },
                        totalQuantity: { $sum: '$quantity' },
                        totalSellingPrice: { $sum: '$SellingPrice' },
                        totalProductPrice: { $sum: '$productPrice' },
                        totalPurchasedAmount: { $sum: { $multiply: ['$quantity', '$productPrice'] } },
                        totalExpenses: { $first: totalExpenses },
                    },
                },
                {
                    $addFields: {
                        totalProfit: {
                            $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
                        },
                    },
                },
                {
                    $sort: { '_id.year': 1 },
                },
            ]);
            return {
                yearlyData,
                totalRevenue: totalRevenue[0],
            };
        });
    }
}
const saleServices = new SaleServices(sale_model_1.default, 'Sale');
exports.default = saleServices;
