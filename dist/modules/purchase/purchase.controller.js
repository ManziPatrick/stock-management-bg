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
const purchase_services_1 = __importDefault(require("./purchase.services"));
class PurchaseController {
    constructor() {
        this.services = purchase_services_1.default;
        // create
        this.create = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.create(req.body, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.CREATED,
                message: 'Purchase created successfully!',
                data: result
            });
        }));
        // read
        this.getAll = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.getAll(req.query);
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Purchase retrieved successfully!',
                meta: {
                    page,
                    limit,
                    total: (result === null || result === void 0 ? void 0 : result.totalCount) || 0,
                    totalPage: Math.ceil((result === null || result === void 0 ? void 0 : result.totalCount) / limit)
                },
                data: result.data
            });
        }));
        // update
        this.update = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.update(req.params.id, req.body);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Purchase updated successfully!',
                data: result
            });
        }));
        // delete
        this.delete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.delete(req.params.id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Purchase deleted successfully!'
            });
        }));
    }
}
const purchaseController = new PurchaseController();
exports.default = purchaseController;
