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
const seller_services_1 = __importDefault(require("./seller.services"));
class SellerControllers {
    constructor() {
        this.services = seller_services_1.default;
        /**
         * create new sale
         */
        this.create = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.create(req.body, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.CREATED,
                message: 'New seller created successfully!',
                data: result
            });
        }));
        /**
         * Get all sale of user with query
         */
        this.readAll = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const result = yield this.services.readAll(req.query); // Remove `req.user._id`
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'All records retrieved successfully', // Adjust the message to fit the context
                meta: {
                    page,
                    limit,
                    total: ((_a = result === null || result === void 0 ? void 0 : result.totalCount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                    totalPage: Math.ceil(((_b = result === null || result === void 0 ? void 0 : result.totalCount[0]) === null || _b === void 0 ? void 0 : _b.total) / limit),
                },
                data: result.data,
            });
        }));
        /**
         * Get single sale of user
         */
        this.readSingle = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.read(req.params.id, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Seller fetched successfully!',
                data: result
            });
        }));
        /**
         * update sale
         */
        this.update = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.update(req.params.id, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Seller updated successfully!',
                data: result
            });
        }));
        /**
         * delete sale
         */
        this.delete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.delete(req.params.id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Seller delete successfully!'
            });
        }));
    }
}
const sellerControllers = new SellerControllers();
exports.default = sellerControllers;
