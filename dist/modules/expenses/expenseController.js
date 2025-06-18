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
exports.removeExpense = exports.addExpense = exports.getExpenses = void 0;
const expenseService_1 = require("./expenseService");
const expenseValidator_1 = require("./expenseValidator");
const error_1 = require("./error");
const expenseModel_1 = require("./expenseModel");
const getExpenses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract query parameters
        const { page = 1, limit = 10, search = '', status = 'ACTIVE', sortField = 'date', sortOrder = 'desc', category, paymentMethod } = req.query;
        // Convert page and limit to numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        if (isNaN(pageNumber) || pageNumber <= 0) {
            throw new error_1.ApiError(400, 'Invalid page number');
        }
        if (isNaN(limitNumber) || limitNumber <= 0) {
            throw new error_1.ApiError(400, 'Invalid limit value');
        }
        // Call the service layer function to get expenses with pagination
        const expensesData = yield (0, expenseService_1.getAllExpenses)({
            page: pageNumber,
            limit: limitNumber,
            search: search,
            status: status,
            sortField: sortField,
            sortOrder: sortOrder,
            category: category,
            paymentMethod: paymentMethod
        });
        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Expenses retrieved successfully',
            data: expensesData.data,
            meta: expensesData.meta,
            total: expensesData.meta.total,
            totalPages: expensesData.meta.totalPages,
            page: pageNumber,
            limit: limitNumber
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        next(error);
    }
});
exports.getExpenses = getExpenses;
const addExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const validation = (0, expenseValidator_1.validateExpense)(req.body);
        if (!validation.success) {
            throw new error_1.ApiError(400, 'Validation Error', validation.error.errors.map((err) => err.message));
        }
        if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a._id)) {
            throw new error_1.ApiError(401, 'Unauthorized: User not logged in');
        }
        // Create a properly typed expense object
        const expenseData = Object.assign(Object.assign({}, validation.data), { createdBy: req.user._id, date: validation.data.date ? new Date(validation.data.date) : new Date() });
        const expense = yield (0, expenseService_1.createExpense)(expenseData);
        res.status(201).json({
            success: true,
            statusCode: 201,
            message: 'Expense created successfully',
            data: expense,
        });
    }
    catch (error) {
        console.error('Error creating expense:', error);
        next(error);
    }
});
exports.addExpense = addExpense;
const removeExpense = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.ApiError(400, 'Expense ID is required');
        }
        // First check if the user has permission to delete this expense
        const expense = yield expenseModel_1.Expense.findById(id);
        if (!expense) {
            throw new error_1.ApiError(404, 'Expense not found');
        }
        // Only allow ADMIN or the creator to delete expenses
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== 'ADMIN' &&
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b._id.toString()) !== expense.createdBy.toString()) {
            throw new error_1.ApiError(403, 'You do not have permission to delete this expense');
        }
        const deletedExpense = yield (0, expenseService_1.deleteExpense)(id);
        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Expense deleted successfully',
            data: deletedExpense,
        });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        next(error);
    }
});
exports.removeExpense = removeExpense;
