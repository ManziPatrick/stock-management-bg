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
const product_services_1 = __importDefault(require("./product.services"));
class ProductControllers {
    constructor() {
        this.services = product_services_1.default;
        /**
         * create new product
         */
        this.create = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.create(req.body, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.CREATED,
                message: 'Product created successfully!',
                data: result
            });
        }));
        /**
         * Add product to stock
         */
        this.addStock = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.addToStock(req.params.id, req.body, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product stock added successfully!',
                data: result
            });
        }));
        /**
         * Get all product of user with query
         */
        this.readAll = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const result = yield this.services.readAll(req.query);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'All products retrieved successfully',
                meta: {
                    page,
                    limit,
                    total: ((_a = result === null || result === void 0 ? void 0 : result.totalCount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                    totalPage: Math.ceil(((_b = result === null || result === void 0 ? void 0 : result.totalCount[0]) === null || _b === void 0 ? void 0 : _b.total) / page)
                },
                data: result.data
            });
        }));
        /**
         * Get total product
         */
        this.getTotalProduct = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.countTotalProduct();
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Count total products successfully',
                data: result[0]
            });
        }));
        /**
         * Get single product of user
         */
        this.readSingle = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.read(req.params.id, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product fetched successfully!',
                data: result
            });
        }));
        /**
         * update product
         */
        this.update = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.update(req.params.id, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product updated successfully!',
                data: result
            });
        }));
        this.readAllPublic = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.services.readAllPublic(req.query);
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 10;
                // Return the response with pagination data
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.OK,
                    message: 'All products retrieved successfully',
                    meta: {
                        page,
                        limit,
                        total: (result === null || result === void 0 ? void 0 : result.totalCount) || 0,
                        totalPage: Math.ceil((result === null || result === void 0 ? void 0 : result.totalCount) / limit),
                    },
                    data: result.data,
                });
            }
            catch (error) {
                // Handling unexpected errors and sending an error response
                console.error(error);
                (0, sendResponse_1.default)(res, {
                    success: false,
                    statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
                    message: 'Failed to retrieve products',
                });
            }
        }));
        /**
         * delete product
         */
        this.delete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.delete(req.params.id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product delete successfully!'
            });
        }));
        /**
         * delete multiple product
         */
        this.bulkDelete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.bulkDelete(req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Delete Selected Product successfully!'
            });
        }));
    }
}
const productControllers = new ProductControllers();
exports.default = productControllers;
