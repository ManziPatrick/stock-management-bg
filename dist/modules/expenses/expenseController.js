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
exports.removeExpense = exports.addExpense = exports.getTotalExpenses = exports.getExpenses = void 0;
const expenseService_1 = require("./expenseService");
const expenseValidator_1 = require("./expenseValidator");
const error_1 = require("./error");
const expenseModel_1 = require("./expenseModel"); // Assuming Expense is the mongoose model
const getExpenses = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract page and limit from query parameters
        const { page = 1, limit = 10, search = '', status = 'ACTIVE' } = req.query;
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
        const expenses = yield (0, expenseService_1.getAllExpenses)({
            page: pageNumber,
            limit: limitNumber,
            search: search,
            status: status,
        });
        // Calculate the total number of expenses (for pagination purposes)
        const totalExpenses = yield (0, exports.getTotalExpenses)({ search: search, status: status });
        const totalPages = Math.ceil(totalExpenses / limitNumber);
        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Expenses retrieved successfully',
            data: expenses,
            pagination: {
                currentPage: pageNumber,
                totalPages,
                totalExpenses,
            },
        });
    }
    catch (error) {
        console.error('Error fetching expenses:', error);
        next(new error_1.ApiError(500, 'Failed to fetch expenses'));
    }
});
exports.getExpenses = getExpenses;
// Service function to get total number of expenses
const getTotalExpenses = (_a) => __awaiter(void 0, [_a], void 0, function* ({ search, status }) {
    const query = { status };
    if (search) {
        query['name'] = { $regex: search, $options: 'i' }; // Example search filter for "name" field
    }
    const totalExpenses = yield expenseModel_1.Expense.countDocuments(query);
    return totalExpenses;
});
exports.getTotalExpenses = getTotalExpenses;
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
        const expenseData = Object.assign(Object.assign({}, validation.data), { createdBy: req.user._id, date: new Date(validation.data.date) });
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
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.ApiError(400, 'Expense ID is required');
        }
        const expense = yield (0, expenseService_1.deleteExpense)(id);
        if (!expense) {
            throw new error_1.ApiError(404, 'Expense not found');
        }
        res.status(200).json({
            success: true,
            statusCode: 200,
            message: 'Expense deleted successfully',
            data: null,
        });
    }
    catch (error) {
        console.error('Error deleting expense:', error);
        next(error);
    }
});
exports.removeExpense = removeExpense;
