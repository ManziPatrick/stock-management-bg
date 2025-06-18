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
const http_status_1 = __importDefault(require("http-status"));
const asyncHandler_1 = __importDefault(require("../../lib/asyncHandler"));
const sendResponse_1 = __importDefault(require("../../lib/sendResponse"));
const sale_services_1 = __importDefault(require("./sale.services"));
class SaleController {
    constructor() {
        this.create = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield sale_services_1.default.create(req.body, req.user._id);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.CREATED,
                success: true,
                message: 'Sale created successfully',
                data: result
            });
        }));
        this.readAll = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const query = {
                search: req.query.search || '',
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: (req.query.sortOrder || 'desc').toLowerCase(),
                filterBy: req.query.filterBy || 'daily',
                status: req.query.status,
                inventoryStatus: req.query.inventoryStatus,
                collectionStatus: req.query.collectionStatus,
                userId: req.user._id,
                userRole: req.user.role
            };
            console.log(query, 'query');
            const result = yield sale_services_1.default.readAll(query);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Sales retrieved successfully',
                data: result.data,
                meta: Object.assign(Object.assign({}, result.meta), { totalPage: result.meta.totalPages })
            });
        }));
        this.readAllInventoryStatus = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const query = {
                search: req.query.search || '',
                page: Number(req.query.page) || 1,
                limit: Number(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: (req.query.sortOrder || 'desc').toLowerCase(),
                filterBy: req.query.filterBy || 'daily',
                status: req.query.status,
                inventoryStatus: req.query.inventoryStatus,
                collectionStatus: req.query.collectionStatus,
                userId: req.user._id,
                userRole: req.user.role
            };
            console.log(query, 'query');
            const result = yield sale_services_1.default.getAllWithInventoryStatus(query);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Sales retrieved successfully',
                data: result.data,
                meta: Object.assign(Object.assign({}, result.meta), { totalPage: result.meta.totalPages })
            });
        }));
        this.readSingle = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield sale_services_1.default.readById(req.params.id);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Sale retrieved successfully',
                data: result
            });
        }));
        this.update = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const result = yield sale_services_1.default.update(id, req.body);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Sale updated successfully',
                data: result
            });
        }));
        this.updateStatus = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { status } = req.body;
            if (!['pending', 'approved', 'rejected', 'credit'].includes(status)) {
                return (0, sendResponse_1.default)(res, {
                    statusCode: http_status_1.default.BAD_REQUEST,
                    success: false,
                    message: 'Invalid status value'
                });
            }
            const result = yield sale_services_1.default.updateStatus(id, status);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: `Sale ${status} successfully`,
                data: result
            });
        }));
        this.markProductsCollected = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            const { collected } = req.body;
            const result = yield sale_services_1.default.markProductsCollected(id, collected);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: `Products collection status updated successfully`,
                data: result
            });
        }));
        this.getTotalCredit = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const result = yield sale_services_1.default.getTotalCredit(user._id);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Credit statistics retrieved successfully',
                data: result.data
            });
        }));
        this.delete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            yield sale_services_1.default.delete(id);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Sale deleted successfully'
            });
        }));
        this.readAllDaily = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const { startDate, endDate } = req.query;
            const result = yield sale_services_1.default.readAllDaily({
                startDate: startDate,
                endDate: endDate,
                // userId: user._id
            });
            return (0, sendResponse_1.default)(res, result);
        }));
        this.readAllWeekly = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const result = yield sale_services_1.default.readAllWeekly(user._id);
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_1.default.OK,
                success: true,
                message: 'Weekly sales retrieved successfully',
                data: result
            });
        }));
        this.readAllMonthly = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const { year } = req.query;
            const result = yield sale_services_1.default.readAllMonthly({
                year: year,
                // userId: user._id
            });
            return (0, sendResponse_1.default)(res, result);
        }));
        this.readAllYearly = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const { startYear, endYear } = req.query;
            const result = yield sale_services_1.default.readAllYearly({
                startYear: startYear,
                endYear: endYear,
                // userId: user._id
            });
            return (0, sendResponse_1.default)(res, result);
        }));
    }
}
exports.default = new SaleController();
