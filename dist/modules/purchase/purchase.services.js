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
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const baseServices_1 = __importDefault(require("../baseServices"));
const purchase_model_1 = __importDefault(require("./purchase.model"));
const sortAndPaginate_pipeline_1 = __importDefault(require("../../lib/sortAndPaginate.pipeline"));
class PurchaseServices extends baseServices_1.default {
    constructor(model, modelName) {
        super(model, modelName);
    }
    /**
     * Create new sale and decrease product stock
     */
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { unitPrice, quantity } = payload;
            payload.user = new mongoose_1.Types.ObjectId(userId);
            payload.totalPrice = unitPrice * quantity;
            return this.model.create(payload);
        });
    }
    /**
     * Read all category of user
     */
    getAll(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const search = query.search ? query.search : '';
            const data = yield this.model.aggregate([
                {
                    $match: {
                        $or: [{ sellerName: { $regex: search, $options: 'i' } }, { productName: { $regex: search, $options: 'i' } }]
                    }
                },
                ...(0, sortAndPaginate_pipeline_1.default)(query)
            ]);
            const totalCount = yield this.model.find().countDocuments();
            return { data, totalCount };
        });
    }
}
const purchaseServices = new PurchaseServices(purchase_model_1.default, 'Purchase');
exports.default = purchaseServices;
