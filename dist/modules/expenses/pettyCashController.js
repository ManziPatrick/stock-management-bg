"use strict";
// @ts-nocheck
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
exports.initializePettyCashHandler = exports.deductFromPettyCash = exports.getAllTransactions = exports.topUpPettyCash = exports.getPettyCash = void 0;
const pettyCashModel_1 = require("./pettyCashModel");
const expenseModel_1 = require("./expenseModel");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
// Define the missing schema
const transactionQuerySchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(val => (val ? parseInt(val) : 1)),
    limit: zod_1.z.string().optional().transform(val => (val ? parseInt(val) : 10)),
    search: zod_1.z.string().optional(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
});
// Get current petty cash status
const getPettyCash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Find the petty cash record or create if doesn't exist
        let pettyCash = yield pettyCashModel_1.PettyCash.findOne()
            .populate({
            path: 'transactions.performedBy',
            select: 'firstName lastName email'
        })
            .sort({ 'transactions.date': -1 });
        // If no petty cash record exists, create one
        if (!pettyCash) {
            pettyCash = new pettyCashModel_1.PettyCash({
                balance: 0,
                transactions: []
            });
            yield pettyCash.save();
        }
        // Sort transactions to get most recent first
        const sortedTransactions = pettyCash.transactions.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        // Return only the 10 most recent transactions
        const recentTransactions = sortedTransactions.slice(0, 10);
        return res.status(200).json({
            success: true,
            data: {
                pettyCash: {
                    balance: pettyCash.balance,
                    lastTopup: pettyCash.lastTopup,
                    transactions: recentTransactions
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching petty cash:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching petty cash',
            error: error.message
        });
    }
});
exports.getPettyCash = getPettyCash;
// Modify your topUpPettyCash function in pettyCashController.ts
const topUpPettyCash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, description } = req.body;
        const userId = req.user._id;
        console.log("topuppeetycash", userId);
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount for top-up'
            });
        }
        // Find the petty cash record or create if doesn't exist
        let pettyCash = yield pettyCashModel_1.PettyCash.findOne();
        if (!pettyCash) {
            pettyCash = new pettyCashModel_1.PettyCash({
                balance: 0,
                transactions: []
            });
        }
        // Create new transaction
        const transaction = {
            date: new Date(),
            amount: amount,
            description: description || 'Petty cash top-up',
            performedBy: userId
        };
        // Update petty cash
        pettyCash.balance += amount;
        pettyCash.lastTopup = new Date();
        pettyCash.transactions.push(transaction);
        yield pettyCash.save();
        return res.status(200).json({
            success: true,
            data: {
                balance: pettyCash.balance,
                transaction
            },
            message: 'Petty cash topped up successfully'
        });
    }
    catch (error) {
        console.error('Error topping up petty cash:', error);
        return res.status(500).json({
            success: false,
            message: 'Error topping up petty cash',
            error: error.message
        });
    }
});
exports.topUpPettyCash = topUpPettyCash;
// Get all petty cash transactions with pagination
const getAllTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Parse and validate query parameters using the schema
        const queryResult = transactionQuerySchema.safeParse(req.query);
        if (!queryResult.success) {
            return res.status(400).json({
                success: false,
                message: 'Invalid query parameters',
                errors: queryResult.error.format()
            });
        }
        const { page, limit, search, startDate, endDate } = queryResult.data;
        // Find the petty cash record
        const pettyCash = yield pettyCashModel_1.PettyCash.findOne()
            .populate({
            path: 'transactions.performedBy',
            select: 'firstName lastName email'
        });
        if (!pettyCash) {
            return res.status(404).json({
                success: false,
                message: 'Petty cash record not found'
            });
        }
        // Filter transactions based on search criteria if provided
        let filteredTransactions = pettyCash.transactions;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredTransactions = filteredTransactions.filter(trans => trans.description.toLowerCase().includes(searchLower));
        }
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Set to end of day
            filteredTransactions = filteredTransactions.filter(trans => {
                const transDate = new Date(trans.date);
                return transDate >= start && transDate <= end;
            });
        }
        // Sort transactions to get most recent first
        filteredTransactions.sort((a, b) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        // Calculate pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const totalTransactions = filteredTransactions.length;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);
        // Calculate pagination metadata
        const totalPages = Math.ceil(totalTransactions / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        return res.status(200).json({
            success: true,
            data: {
                transactions: paginatedTransactions,
                pagination: {
                    total: totalTransactions,
                    page,
                    limit,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching petty cash transactions:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching petty cash transactions',
            error: error.message
        });
    }
});
exports.getAllTransactions = getAllTransactions;
// Deduct from petty cash (expense)
const deductFromPettyCash = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { amount, description, expenseDetails } = req.body;
        const userId = req.user.id;
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount for deduction'
            });
        }
        // Find the petty cash record
        const pettyCash = yield pettyCashModel_1.PettyCash.findOne().session(session);
        if (!pettyCash) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                message: 'Petty cash record not found'
            });
        }
        // Check if there's enough balance
        if (pettyCash.balance < amount) {
            yield session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                message: 'Insufficient petty cash balance'
            });
        }
        // Create expense record if expenseDetails provided
        let expenseId;
        if (expenseDetails) {
            const expense = new expenseModel_1.Expense(Object.assign(Object.assign({}, expenseDetails), { amount, paidFrom: 'petty-cash', recordedBy: userId }));
            const savedExpense = yield expense.save({ session });
            expenseId = savedExpense._id;
        }
        // Create new transaction
        const transaction = {
            date: new Date(),
            amount: -amount, // Negative amount for deduction
            description: description || 'Petty cash expense',
            expenseId,
            performedBy: userId
        };
        // Update petty cash
        pettyCash.balance -= amount;
        pettyCash.transactions.push(transaction);
        yield pettyCash.save({ session });
        yield session.commitTransaction();
        session.endSession();
        return res.status(200).json({
            success: true,
            data: {
                balance: pettyCash.balance,
                transaction
            },
            message: 'Amount deducted from petty cash successfully'
        });
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        console.error('Error deducting from petty cash:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deducting from petty cash',
            error: error.message
        });
    }
});
exports.deductFromPettyCash = deductFromPettyCash;
const initializePettyCashHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const initializedPettyCash = yield initializePettyCash(userId);
        return res.status(200).json({
            success: true,
            data: initializedPettyCash,
            message: 'Petty cash initialized successfully'
        });
    }
    catch (error) {
        console.error('Error initializing petty cash:', error);
        return res.status(500).json({
            success: false,
            message: 'Error initializing petty cash',
            error: error.message
        });
    }
});
exports.initializePettyCashHandler = initializePettyCashHandler;
