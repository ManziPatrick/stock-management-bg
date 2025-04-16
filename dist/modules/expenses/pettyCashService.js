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
exports.getAllTransactionsService = exports.recordPettyCashExpense = exports.checkPettyCashBalance = exports.topUpPettyCash = exports.getPettyCashStatus = exports.initializePettyCash = void 0;
const pettyCashModel_1 = require("./pettyCashModel");
const expenseModel_1 = require("./expenseModel");
const error_1 = require("./error");
/**
 * Initialize petty cash if it doesn't exist
 */
const initializePettyCash = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if petty cash record exists
        const pettyCashExists = yield pettyCashModel_1.PettyCash.findOne();
        if (!pettyCashExists) {
            // Create new petty cash record with initial balance of 0
            return yield pettyCashModel_1.PettyCash.create({
                balance: 0,
                lastTopup: new Date(),
                transactions: [{
                        date: new Date(),
                        amount: 0,
                        description: 'Initial setup',
                        performedBy: userId
                    }]
            });
        }
        return pettyCashExists;
    }
    catch (error) {
        console.error('Error initializing petty cash:', error);
        throw new Error('Failed to initialize petty cash');
    }
});
exports.initializePettyCash = initializePettyCash;
/**
 * Get the current petty cash status and recent transactions
 */
const getPettyCashStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find or create petty cash record
        let pettyCash = yield pettyCashModel_1.PettyCash.findOne().populate({
            path: 'transactions.performedBy',
            select: 'name email'
        });
        if (!pettyCash) {
            throw new error_1.ApiError(404, 'Petty cash record not found');
        }
        // Sort transactions by date in descending order (most recent first)
        pettyCash.transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        // Get petty cash expenses for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const pettyCashExpenses = yield expenseModel_1.Expense.find({
            paymentMethod: 'PETTY_CASH',
            date: { $gte: startOfMonth }
        }).select('title amount date createdBy')
            .populate('createdBy', 'name email')
            .sort({ date: -1 });
        return {
            pettyCash,
            monthlyExpenses: pettyCashExpenses
        };
    }
    catch (error) {
        console.error('Error getting petty cash status:', error);
        throw error;
    }
});
exports.getPettyCashStatus = getPettyCashStatus;
/**
 * Top up the petty cash balance
 */
const topUpPettyCash = (amount, description, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (amount <= 0) {
            throw new error_1.ApiError(400, 'Top-up amount must be positive');
        }
        // Find or initialize petty cash
        let pettyCash = yield pettyCashModel_1.PettyCash.findOne();
        if (!pettyCash) {
            pettyCash = yield (0, exports.initializePettyCash)(userId);
        }
        // Add to balance and record transaction
        pettyCash.balance += amount;
        pettyCash.lastTopup = new Date();
        pettyCash.transactions.push({
            date: new Date(),
            amount: amount,
            description: description || 'Petty cash top-up',
            performedBy: userId
        });
        yield pettyCash.save();
        return pettyCash;
    }
    catch (error) {
        console.error('Error topping up petty cash:', error);
        throw error;
    }
});
exports.topUpPettyCash = topUpPettyCash;
/**
 * Check if there's enough petty cash for an expense
 */
const checkPettyCashBalance = (amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const pettyCash = yield pettyCashModel_1.PettyCash.findOne();
        if (!pettyCash) {
            return false;
        }
        return pettyCash.balance >= amount;
    }
    catch (error) {
        console.error('Error checking petty cash balance:', error);
        throw new Error('Failed to check petty cash balance');
    }
});
exports.checkPettyCashBalance = checkPettyCashBalance;
/**
 * Record a petty cash expense
 */
const recordPettyCashExpense = (expenseId, amount, description, userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let pettyCash = yield pettyCashModel_1.PettyCash.findOne();
        if (!pettyCash) {
            pettyCash = yield (0, exports.initializePettyCash)(userId);
        }
        // Check if sufficient balance
        if (pettyCash.balance < amount) {
            throw new error_1.ApiError(400, 'Insufficient petty cash balance');
        }
        // Deduct from balance and record transaction
        pettyCash.balance -= amount;
        pettyCash.transactions.push({
            date: new Date(),
            amount: -amount, // Negative amount for expenses
            description: description,
            expenseId: expenseId,
            performedBy: userId
        });
        yield pettyCash.save();
        return pettyCash;
    }
    catch (error) {
        console.error('Error recording petty cash expense:', error);
        throw error;
    }
});
exports.recordPettyCashExpense = recordPettyCashExpense;
/**
 * Get all petty cash transactions with optional pagination and filtering
 * @param page Current page number (default: 1)
 * @param limit Number of items per page (default: 20)
 * @param startDate Optional start date for filtering
 * @param endDate Optional end date for filtering
 * @param transactionType Optional type filter ('topup' for positive amounts, 'expense' for negative amounts)
 */
const getAllTransactionsService = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (page = 1, limit = 20, startDate, endDate, transactionType) {
    try {
        // Find petty cash record
        const pettyCash = yield pettyCashModel_1.PettyCash.findOne().populate({
            path: 'transactions.performedBy',
            select: 'name email'
        }).populate({
            path: 'transactions.expenseId',
            select: 'title category'
        });
        if (!pettyCash) {
            throw new error_1.ApiError(404, 'Petty cash record not found');
        }
        // Apply filters to transactions
        let filteredTransactions = [...pettyCash.transactions];
        // Filter by date range if provided
        if (startDate) {
            filteredTransactions = filteredTransactions.filter(t => t.date >= startDate);
        }
        if (endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            filteredTransactions = filteredTransactions.filter(t => t.date <= endOfDay);
        }
        // Filter by transaction type if provided
        if (transactionType === 'topup') {
            filteredTransactions = filteredTransactions.filter(t => t.amount > 0);
        }
        else if (transactionType === 'expense') {
            filteredTransactions = filteredTransactions.filter(t => t.amount < 0);
        }
        // Sort transactions by date (most recent first)
        filteredTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
        // Calculate pagination
        const totalTransactions = filteredTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, totalTransactions);
        // Get paginated transactions
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
        return {
            transactions: paginatedTransactions,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalTransactions,
                itemsPerPage: limit
            }
        };
    }
    catch (error) {
        console.error('Error getting petty cash transactions:', error);
        throw error;
    }
});
exports.getAllTransactionsService = getAllTransactionsService;
