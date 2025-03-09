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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpense = exports.createExpense = exports.getAllExpenses = void 0;
const expenseModel_1 = require("./expenseModel");
/**
 * Fetch all expenses based on a query.
 * @param query - The query object for filtering expenses.
 * @returns A promise that resolves to an array of expenses.
 */
const getAllExpenses = (_a) => __awaiter(void 0, [_a], void 0, function* ({ page = 1, limit = 10, search = '', status = 'ACTIVE', }) {
    const query = { status };
    if (search) {
        query['name'] = { $regex: search, $options: 'i' };
    }
    try {
        // Get current date components
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        // Fetch paginated expenses
        const expenses = yield expenseModel_1.Expense.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
        const totalExpenses = yield expenseModel_1.Expense.countDocuments(query);
        // Get overall statistics
        const [stats] = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' },
                    totalCount: { $count: {} },
                    averageAmount: { $avg: '$amount' },
                    minAmount: { $min: '$amount' },
                    maxAmount: { $max: '$amount' }
                }
            }
        ]);
        // Get daily statistics
        const dailyStats = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        day: { $dayOfMonth: '$date' }
                    },
                    dailyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
        ]);
        // Get monthly statistics
        const monthlyStats = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    monthlyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);
        // Get yearly statistics
        const yearlyStats = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' }
                    },
                    yearlyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1 } }
        ]);
        // Get recent purchases
        const recentPurchases = yield expenseModel_1.Expense.find(query)
            .sort({ date: -1 })
            .limit(5)
            .select('_id sellerName amount date status')
            .lean();
        return {
            statusCode: 200,
            success: true,
            message: "Purchases retrieved successfully!",
            data: expenses,
            meta: {
                page,
                limit,
                total: totalExpenses,
                totalPage: Math.ceil(totalExpenses / limit),
                totalExpenses: {
                    stats,
                    dailyStats,
                    monthlyStats,
                    yearlyStats,
                    recentPurchases
                }
            }
        };
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        throw new Error('Failed to fetch expenses.');
    }
});
exports.getAllExpenses = getAllExpenses;
/**
 * Create a new expense document.
 * @param data - The data for the new expense.
 * @returns A promise that resolves to the created expense document.
 */
const createExpense = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (typeof data.date === 'string') {
            data.date = new Date(data.date);
            if (isNaN(data.date.getTime())) {
                throw new Error('Invalid date format.');
            }
        }
        if (!data.createdBy) {
            throw new Error('Missing createdBy field.');
        }
        return yield expenseModel_1.Expense.create(data);
    }
    catch (error) {
        if (error instanceof Error) {
            throw error; // Rethrow validation errors
        }
        throw new Error('Failed to create expense.');
    }
});
exports.createExpense = createExpense;
/**
 * Delete an expense by its ID.
 * @param id - The ID of the expense to delete.
 * @returns A promise that resolves to the deleted expense document or null if not found.
 */
const deleteExpense = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expense = yield expenseModel_1.Expense.findByIdAndDelete(id);
        if (!expense) {
            throw new Error(`Expense with ID ${id} not found.`);
        }
        return expense;
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        throw new Error('Failed to delete expense.');
    }
});
exports.deleteExpense = deleteExpense;
