"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const baseServices_1 = __importDefault(require("../baseServices"));
const sale_model_1 = __importDefault(require("./sale.model"));
const product_model_1 = __importDefault(require("../product/product.model"));
const customError_1 = __importDefault(require("../../errors/customError"));
const expenseModel_1 = require("../expenses/expenseModel");
class SaleServices extends baseServices_1.default {
    constructor() {
        super(sale_model_1.default, 'SaleTransaction');
    }
    processProduct(product) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingProduct = yield product_model_1.default.findById(product.product);
            if (!existingProduct) {
                throw new customError_1.default(404, `Product not found: ${product.product}`);
            }
            if (product.quantity > existingProduct.stock) {
                throw new customError_1.default(400, `Insufficient stock for ${existingProduct.name}`);
            }
            yield product_model_1.default.findByIdAndUpdate(existingProduct._id, { $inc: { stock: -product.quantity } });
            return Object.assign(Object.assign({}, product), { productName: existingProduct.name, productPrice: existingProduct.price });
        });
    }
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const transactionId = new mongoose_1.default.Types.ObjectId();
                const saleDate = new Date(payload.date);
                // Process all products
                const processedProducts = yield Promise.all(payload.products.map(product => this.processProduct(product)));
                // Calculate total amount
                const totalAmount = processedProducts.reduce((sum, product) => sum + (product.quantity * product.SellingPrice), 0);
                // Create sale transaction
                const saleTransaction = yield sale_model_1.default.create({
                    user: userId,
                    buyerName: payload.buyerName,
                    date: saleDate,
                    paymentMode: payload.paymentMode,
                    paymentDetails: payload.paymentDetails,
                    products: processedProducts,
                    transactionId,
                    totalAmount
                });
                // Calculate additional statistics
                const statistics = yield this.calculateStatistics(userId);
                return {
                    transaction: saleTransaction,
                    statistics
                };
            }
            catch (error) {
                throw new customError_1.default(400, error.message || 'Failed to create sale');
            }
        });
    }
    calculateStatistics(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dailyStats = yield sale_model_1.default.aggregate([
                {
                    $match: {
                        user: new mongoose_1.Types.ObjectId(userId),
                        date: { $gte: today }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: '$totalAmount' },
                        transactionCount: { $sum: 1 }
                    }
                }
            ]);
            return {
                daily: dailyStats[0] || { totalSales: 0, transactionCount: 0 }
            };
        });
    }
    // Existing calculation methods remain unchanged
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
                { $sort: { _id: 1 } },
                {
                    $group: {
                        _id: null,
                        sizeWiseRevenue: { $push: '$$ROOT' },
                        totalOverallRevenue: { $sum: '$totalRevenue' },
                        totalOverallStock: { $sum: '$totalStock' }
                    }
                }
            ]);
        });
    }
    calculatePaymentStats() {
        return __awaiter(this, arguments, void 0, function* (matchStage = {}) {
            return yield this.model.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        cashTotal: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] }
                        },
                        momoTotal: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] }
                        },
                        chequeTotal: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] }
                        },
                        transferTotal: {
                            $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] }
                        },
                        totalAmount: { $sum: '$totalPrice' }
                    }
                }
            ]);
        });
    }
    calculateExpenses(userId, dateRange) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('Calculating expenses for:', {
                userId,
                dateRange,
                userIdObject: new mongoose_1.Types.ObjectId(userId)
            });
            const matchStage = {
                createdBy: new mongoose_1.Types.ObjectId(userId),
                status: 'ACTIVE'
            };
            if (dateRange) {
                matchStage.date = {
                    $gte: dateRange.startDate,
                    $lte: dateRange.endDate
                };
            }
            try {
                const totalExpenses = yield expenseModel_1.Expense.aggregate([
                    {
                        $match: matchStage
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$amount' }
                        }
                    }
                ]);
                console.log('Expense aggregation result:', totalExpenses);
                // If expenses found, return the total, otherwise return 0
                return totalExpenses.length > 0 ? totalExpenses[0].total : 0;
            }
            catch (error) {
                console.error('Error calculating expenses:', error);
                throw error;
            }
        });
    }
    readAll() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            const search = query.search ? query.search : '';
            const page = query.page ? Number(query.page) : 1;
            const limit = query.limit ? Number(query.limit) : 10;
            const userId = query.userId;
            // Base match stage for search criteria
            const matchStage = {
                $match: {
                    $or: [
                        { productName: { $regex: search, $options: 'i' } },
                        { buyerName: { $regex: search, $options: 'i' } },
                    ],
                },
            };
            try {
                // Get paginated results first - without population
                const skip = (page - 1) * limit;
                const data = yield this.model
                    .find(matchStage.$match)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean();
                // Overall Sales Statistics with Payment Mode Totals
                const [stats] = yield this.model.aggregate([
                    matchStage,
                    {
                        $unwind: "$products" // Unwind the products array
                    },
                    {
                        $group: {
                            _id: null,
                            totalQuantitySold: { $sum: "$products.quantity" },
                            totalSaleAmount: { $sum: "$totalAmount" },
                            totalSellingPrice: {
                                $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] }
                            },
                            totalProductPrice: {
                                $sum: { $multiply: ["$products.quantity", "$products.productPrice"] }
                            },
                            totalMarginProfit: {
                                $sum: {
                                    $multiply: [
                                        "$products.quantity",
                                        { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                                    ]
                                }
                            },
                            averageSaleAmount: { $avg: "$totalAmount" },
                            totalCount: { $sum: 1 },
                            cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
                            momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
                            chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
                            transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
                        }
                    }
                ]);
                // Get expenses for the entire period
                const totalExpenses = yield this.calculateExpenses(userId);
                // Add expenses to stats
                const statsWithExpenses = stats ? Object.assign(Object.assign({}, stats), { expenses: totalExpenses, netProfit: stats.totalMarginProfit - totalExpenses }) : {
                    totalQuantitySold: 0,
                    totalSaleAmount: 0,
                    totalSellingPrice: 0,
                    totalProductPrice: 0,
                    totalMarginProfit: 0,
                    expenses: totalExpenses,
                    netProfit: -totalExpenses,
                    averageSaleAmount: 0,
                    totalCount: 0,
                    cashTotal: 0,
                    momoTotal: 0,
                    chequeTotal: 0,
                    transferTotal: 0
                };
                // Rest of the aggregation queries
                const [dailyStats, monthlyStats, yearlyStats, recentSales] = yield Promise.all([
                    this.getDailyStats(matchStage),
                    this.getMonthlyStats(matchStage),
                    this.getYearlyStats(matchStage),
                    this.getRecentSales(matchStage)
                ]);
                // Add expenses to dailyStats
                const dailyStatsWithExpenses = yield this.addExpensesToDailyStats(dailyStats, userId);
                // Add expenses to monthlyStats
                const monthlyStatsWithExpenses = yield this.addExpensesToMonthlyStats(monthlyStats, userId);
                // Add expenses to yearlyStats
                const yearlyStatsWithExpenses = yield this.addExpensesToYearlyStats(yearlyStats, userId);
                const totalCount = yield this.model.countDocuments(matchStage.$match);
                const [totalRevenue] = yield this.model.aggregate([
                    matchStage, // Add this to filter results based on the search
                    {
                        $group: {
                            _id: null,
                            total: { $sum: '$totalAmount' },
                        },
                    },
                ]);
                return {
                    statusCode: 200,
                    success: true,
                    message: 'Sales retrieved successfully!',
                    data,
                    meta: {
                        page,
                        limit,
                        total: totalCount,
                        totalPages: Math.ceil(totalCount / limit),
                        totalSales: {
                            stats: statsWithExpenses,
                            dailyStats: dailyStatsWithExpenses,
                            monthlyStats: monthlyStatsWithExpenses,
                            yearlyStats: yearlyStatsWithExpenses,
                            recentSales,
                            totalRevenue: (totalRevenue === null || totalRevenue === void 0 ? void 0 : totalRevenue.total) || 0,
                        },
                    },
                };
            }
            catch (error) {
                console.error('Error fetching sales:', error);
                throw new Error('Failed to fetch sales.');
            }
        });
    }
    // Helper methods to add expenses to stats
    addExpensesToDailyStats(dailyStats, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!dailyStats || dailyStats.length === 0)
                return [];
            // Extract all unique dates from sales
            const dates = dailyStats.map(stat => ({
                year: stat._id.year,
                month: stat._id.month,
                day: stat._id.day
            }));
            // Get all daily expenses for these dates
            const dailyExpenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE'
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' },
                            day: { $dayOfMonth: '$date' }
                        },
                        dailyExpenses: { $sum: '$amount' }
                    }
                }
            ]);
            // Combine with dailyStats
            return dailyStats.map(stat => {
                const matchingExpense = dailyExpenses.find(exp => exp._id.year === stat._id.year &&
                    exp._id.month === stat._id.month &&
                    exp._id.day === stat._id.day);
                const expenses = matchingExpense ? matchingExpense.dailyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses, netProfit: stat.dailyProfit - expenses });
            });
        });
    }
    addExpensesToMonthlyStats(monthlyStats, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!monthlyStats || monthlyStats.length === 0)
                return [];
            // Get all monthly expenses
            const monthlyExpenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE'
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        monthlyExpenses: { $sum: '$amount' }
                    }
                }
            ]);
            // Combine with monthlyStats
            return monthlyStats.map(stat => {
                const matchingExpense = monthlyExpenses.find(exp => exp._id.year === stat._id.year &&
                    exp._id.month === stat._id.month);
                const expenses = matchingExpense ? matchingExpense.monthlyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses, netProfit: stat.monthlyTotal - expenses // Assuming profit was calculated already
                 });
            });
        });
    }
    addExpensesToYearlyStats(yearlyStats, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!yearlyStats || yearlyStats.length === 0)
                return [];
            // Get all yearly expenses
            const yearlyExpenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE'
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' }
                        },
                        yearlyExpenses: { $sum: '$amount' }
                    }
                }
            ]);
            // Combine with yearlyStats
            return yearlyStats.map(stat => {
                const matchingExpense = yearlyExpenses.find(exp => exp._id.year === stat._id.year);
                const expenses = matchingExpense ? matchingExpense.yearlyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses, netProfit: stat.yearlyTotal - expenses // Assuming profit was calculated already
                 });
            });
        });
    }
    // Fix for getRecentSales method to properly calculate profit
    getRecentSales(matchStage) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.aggregate([
                matchStage,
                { $sort: { createdAt: -1 } },
                { $limit: 5 },
                {
                    $project: {
                        _id: 1,
                        buyerName: 1,
                        totalPrice: "$totalAmount",
                        paymentMode: 1,
                        createdAt: 1,
                        // Calculate profit from products array
                        profit: {
                            $reduce: {
                                input: "$products",
                                initialValue: 0,
                                in: {
                                    $add: [
                                        "$$value",
                                        {
                                            $multiply: [
                                                "$$this.quantity",
                                                { $subtract: ["$$this.SellingPrice", "$$this.productPrice"] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            ]);
        });
    }
    // Fix for transaction calculations
    getSalesByTransactionId(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // Find all sales with this transaction ID
                const sales = yield this.model.find({ transactionId })
                    .populate('user', 'name email')
                    .sort({ createdAt: -1 })
                    .lean();
                if (!sales || sales.length === 0) {
                    throw new customError_1.default(404, 'Transaction not found');
                }
                // Calculate transaction summary with null checks
                const transactionSummary = {
                    transactionId,
                    totalItems: sales.length,
                    totalQuantity: sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
                    totalAmount: sales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0),
                    totalProfit: sales.reduce((sum, sale) => {
                        if (sale.SellingPrice && sale.productPrice && sale.quantity) {
                            return sum + (sale.quantity * (sale.SellingPrice - sale.productPrice));
                        }
                        return sum;
                    }, 0),
                    paymentMode: (_a = sales[0]) === null || _a === void 0 ? void 0 : _a.paymentMode,
                    buyerName: (_b = sales[0]) === null || _b === void 0 ? void 0 : _b.buyerName,
                    createdAt: (_c = sales[0]) === null || _c === void 0 ? void 0 : _c.createdAt,
                    user: (_d = sales[0]) === null || _d === void 0 ? void 0 : _d.user
                };
                return {
                    statusCode: 200,
                    success: true,
                    message: 'Transaction retrieved successfully',
                    data: {
                        transactionSummary,
                        items: sales
                    }
                };
            }
            catch (error) {
                console.error('Error fetching transaction:', error);
                throw new customError_1.default(error.statusCode || 500, error.message);
            }
        });
    }
    getDailyStats(matchStage) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.aggregate([
                matchStage,
                {
                    $unwind: "$products"
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$date" },
                            month: { $month: "$date" },
                            day: { $dayOfMonth: "$date" },
                            paymentMode: "$paymentMode"
                        },
                        total: { $sum: "$totalAmount" },
                        count: { $sum: 1 },
                        profit: {
                            $sum: {
                                $multiply: [
                                    "$products.quantity",
                                    { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                                ]
                            }
                        }
                    }
                },
                // Rest of aggregation remains the same
                {
                    $group: {
                        _id: {
                            year: "$_id.year",
                            month: "$_id.month",
                            day: "$_id.day"
                        },
                        dailyTotal: { $sum: "$total" },
                        dailyProfit: { $sum: "$profit" },
                        payments: {
                            $push: {
                                mode: "$_id.paymentMode",
                                total: "$total",
                                count: "$count"
                            }
                        },
                        // Payment mode totals remain the same
                        cashTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$_id.paymentMode", "cash"] },
                                    "$total",
                                    0
                                ]
                            }
                        },
                        momoTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$_id.paymentMode", "momo"] },
                                    "$total",
                                    0
                                ]
                            }
                        },
                        chequeTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$_id.paymentMode", "cheque"] },
                                    "$total",
                                    0
                                ]
                            }
                        },
                        transferTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$_id.paymentMode", "transfer"] },
                                    "$total",
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
            ]);
        });
    }
    // Fixed Monthly Stats Method
    getMonthlyStats(matchStage) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.aggregate([
                matchStage,
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' },
                            paymentMode: '$paymentMode'
                        },
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: '$_id.year',
                            month: '$_id.month'
                        },
                        monthlyTotal: { $sum: '$total' },
                        payments: {
                            $push: {
                                mode: '$_id.paymentMode',
                                total: '$total',
                                count: '$count'
                            }
                        },
                        cashTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'cash'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        momoTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'momo'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        chequeTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'cheque'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        transferTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'transfer'] },
                                    '$total',
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } }
            ]);
        });
    }
    // Fixed Yearly Stats Method
    getYearlyStats(matchStage) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.aggregate([
                matchStage,
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            paymentMode: '$paymentMode'
                        },
                        total: { $sum: '$totalAmount' },
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: { year: '$_id.year' },
                        yearlyTotal: { $sum: '$total' },
                        payments: {
                            $push: {
                                mode: '$_id.paymentMode',
                                total: '$total',
                                count: '$count'
                            }
                        },
                        cashTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'cash'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        momoTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'momo'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        chequeTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'cheque'] },
                                    '$total',
                                    0
                                ]
                            }
                        },
                        transferTotal: {
                            $sum: {
                                $cond: [
                                    { $eq: ['$_id.paymentMode', 'transfer'] },
                                    '$total',
                                    0
                                ]
                            }
                        }
                    }
                },
                { $sort: { '_id.year': -1 } }
            ]);
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
                        totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
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
    readAllDaily(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startDate, endDate, userId } = query;
            const startDateTime = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
            const endDateTime = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));
            // First get sales stats
            const matchStage = {
                $match: {
                    user: new mongoose_1.Types.ObjectId(userId),
                    createdAt: {
                        $gte: startDateTime,
                        $lte: endDateTime
                    }
                }
            };
            const stats = yield this.model.aggregate([
                matchStage,
                {
                    $unwind: "$products"
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                            day: { $dayOfMonth: "$createdAt" }
                        },
                        totalQuantitySold: { $sum: "$products.quantity" },
                        totalSaleAmount: { $sum: "$totalAmount" },
                        totalSellingPrice: {
                            $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] }
                        },
                        totalProductPrice: {
                            $sum: { $multiply: ["$products.quantity", "$products.productPrice"] }
                        },
                        totalMarginProfit: {
                            $sum: {
                                $multiply: [
                                    "$products.quantity",
                                    { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                                ]
                            }
                        },
                        averageSaleAmount: { $avg: "$totalAmount" },
                        totalCount: { $sum: 1 },
                        cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
                        momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
                        chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
                        transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
                    }
                },
                { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
            ]);
            // Now get total expenses for this period
            const expenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE',
                        date: {
                            $gte: startDateTime,
                            $lte: endDateTime
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' },
                            day: { $dayOfMonth: '$date' }
                        },
                        dailyExpenses: { $sum: '$amount' }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
                }
            ]);
            // Combine sales and expenses data
            const enrichedStats = stats.map(stat => {
                const matchingExpense = expenses.find(exp => exp._id.year === stat._id.year &&
                    exp._id.month === stat._id.month &&
                    exp._id.day === stat._id.day);
                const dailyExpenses = matchingExpense ? matchingExpense.dailyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses: dailyExpenses, netProfit: stat.totalMarginProfit - dailyExpenses });
            });
            return {
                statusCode: 200,
                success: true,
                message: 'Daily sales retrieved successfully!',
                data: enrichedStats
            };
        });
    }
    readAllMonthly(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { year, userId } = query;
            const currentYear = year || new Date().getFullYear().toString();
            const startDate = new Date(`${currentYear}-01-01`);
            const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);
            const matchStage = {
                $match: {
                    user: new mongoose_1.Types.ObjectId(userId),
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            };
            const stats = yield this.model.aggregate([
                matchStage,
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' },
                            month: { $month: '$createdAt' }
                        },
                        totalQuantitySold: { $sum: '$quantity' },
                        totalSaleAmount: { $sum: '$totalPrice' },
                        totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                        totalProductPrice: { $sum: '$productPrice' },
                        profit: { $sum: { $subtract: ['$SellingPrice', '$productPrice'] } },
                        totalMarginProfit: {
                            $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
                        },
                        averageSaleAmount: { $avg: '$totalPrice' },
                        totalCount: { $sum: 1 },
                        cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
                        momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
                        chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
                        transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
                    }
                },
                { $sort: { '_id.year': -1, '_id.month': -1 } }
            ]);
            // Get monthly expenses
            const expenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE',
                        date: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' },
                            month: { $month: '$date' }
                        },
                        monthlyExpenses: { $sum: '$amount' }
                    }
                },
                {
                    $sort: { '_id.year': -1, '_id.month': -1 }
                }
            ]);
            const enrichedStats = stats.map(stat => {
                const matchingExpense = expenses.find(exp => exp._id.year === stat._id.year &&
                    exp._id.month === stat._id.month);
                const monthlyExpenses = matchingExpense ? matchingExpense.monthlyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses: monthlyExpenses, netProfit: stat.totalMarginProfit - monthlyExpenses });
            });
            return {
                statusCode: 200,
                success: true,
                message: 'Monthly sales retrieved successfully!',
                data: enrichedStats
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
    getTotalPurchasedAmount() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield this.model.aggregate([
                {
                    $group: {
                        _id: null,
                        totalPurchasedAmount: { $sum: '$totalPrice' }
                    }
                }
            ]);
            // Return the aggregated total or 0 if no purchases are found
            return result.length > 0 ? result[0].totalPurchasedAmount : 0;
        });
    }
    readAllYearly(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { startYear, endYear, userId } = query;
            const currentYear = new Date().getFullYear().toString();
            // Set default date range if not provided
            const startDate = startYear ? new Date(`${startYear}-01-01`) : new Date(`${currentYear}-01-01`);
            const endDate = endYear
                ? new Date(`${endYear}-12-31T23:59:59.999Z`)
                : new Date(`${currentYear}-12-31T23:59:59.999Z`);
            const matchStage = {
                $match: {
                    user: new mongoose_1.Types.ObjectId(userId),
                    createdAt: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            };
            // Get yearly sales statistics
            const stats = yield this.model.aggregate([
                matchStage,
                {
                    $group: {
                        _id: {
                            year: { $year: '$createdAt' }
                        },
                        totalQuantitySold: { $sum: '$quantity' },
                        totalSaleAmount: { $sum: '$totalPrice' },
                        totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                        totalProductPrice: { $sum: '$productPrice' },
                        profit: { $sum: { $subtract: ['$SellingPrice', '$productPrice'] } },
                        totalMarginProfit: {
                            $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
                        },
                        averageSaleAmount: { $avg: '$totalPrice' },
                        totalCount: { $sum: 1 },
                        cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
                        momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
                        chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
                        transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
                    }
                },
                { $sort: { '_id.year': -1 } }
            ]);
            // Get yearly expenses
            const expenses = yield expenseModel_1.Expense.aggregate([
                {
                    $match: {
                        createdBy: new mongoose_1.Types.ObjectId(userId),
                        status: 'ACTIVE',
                        date: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$date' }
                        },
                        yearlyExpenses: { $sum: '$amount' }
                    }
                },
                {
                    $sort: { '_id.year': -1 }
                }
            ]);
            // Combine sales and expenses data
            const enrichedStats = stats.map(stat => {
                const matchingExpense = expenses.find(exp => exp._id.year === stat._id.year);
                const yearlyExpenses = matchingExpense ? matchingExpense.yearlyExpenses : 0;
                return Object.assign(Object.assign({}, stat), { expenses: yearlyExpenses, netProfit: stat.totalMarginProfit - yearlyExpenses });
            });
            return {
                statusCode: 200,
                success: true,
                message: 'Yearly sales retrieved successfully!',
                data: enrichedStats
            };
        });
    }
}
const saleServices = new SaleServices();
exports.default = saleServices;
