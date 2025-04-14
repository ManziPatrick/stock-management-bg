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
const pettyCashService_1 = require("./pettyCashService");
const error_1 = require("./error");
/**
 * Fetch all expenses based on a query.
 * @param query - The query object for filtering expenses.
 * @returns A promise that resolves to an array of expenses.
 */
const getAllExpenses = (_a) => __awaiter(void 0, [_a], void 0, function* ({ page = 1, limit = 10, search = '', status = 'ACTIVE', createdBy = null }) {
    const query = { status };
    // If createdBy is provided, filter by creator
    if (createdBy) {
        query.createdBy = createdBy;
    }
    if (search) {
        query['title'] = { $regex: search, $options: 'i' };
    }
    try {
        // Get current date components
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();
        // Fetch paginated expenses with user details
        const expenses = yield expenseModel_1.Expense.find(query)
            .sort({ date: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('createdBy', 'name email role')
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
        // Get payment method breakdown
        const paymentMethodStats = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$amount' },
                    count: { $count: {} }
                }
            }
        ]);
        // Get category breakdown
        const categoryStats = yield expenseModel_1.Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $count: {} }
                }
            }
        ]);
        return {
            statusCode: 200,
            success: true,
            message: "Expenses retrieved successfully!",
            data: expenses,
            meta: {
                page,
                limit,
                total: totalExpenses,
                totalPages: Math.ceil(totalExpenses / limit),
                stats,
                paymentMethodStats,
                categoryStats
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
        // Check if petty cash has sufficient balance for the expense
        if (data.paymentMethod === 'PETTY_CASH') {
            const hasSufficientBalance = yield (0, pettyCashService_1.checkPettyCashBalance)(data.amount);
            if (!hasSufficientBalance) {
                throw new error_1.ApiError(400, 'Insufficient petty cash balance');
            }
        }
        // Create the expense
        const expense = yield expenseModel_1.Expense.create(data);
        // If it's a petty cash expense, update the petty cash balance
        if (data.paymentMethod === 'PETTY_CASH') {
            yield (0, pettyCashService_1.recordPettyCashExpense)(expense._id, expense.amount, expense.title, expense.createdBy);
        }
        return expense;
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
