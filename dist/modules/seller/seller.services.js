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
/* eslint-disable no-unsafe-finally */
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const sortAndPaginate_pipeline_1 = __importDefault(require("../../lib/sortAndPaginate.pipeline"));
const baseServices_1 = __importDefault(require("../baseServices"));
const seller_model_1 = __importDefault(require("./seller.model"));
class SellerServices extends baseServices_1.default {
    constructor(model, modelName) {
        super(model, modelName);
    }
    /**
     * Create new sale and decrease product stock
     */
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            payload.user = userId;
            return this.model.create(payload);
        });
    }
    /**
     *  Get all sale
     */
    readAll() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            const search = query.search ? query.search : '';
            const data = yield this.model.aggregate([
                {
                    $match: {
                        $or: [
                            { name: { $regex: search, $options: 'i' } },
                            { email: { $regex: search, $options: 'i' } },
                            { contactNo: { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                ...(0, sortAndPaginate_pipeline_1.default)(query) // Assuming this handles pagination and sorting
            ]);
            const totalCount = yield this.model.aggregate([
                {
                    $match: {
                        $or: [
                            { name: { $regex: search, $options: 'i' } },
                            { email: { $regex: search, $options: 'i' } },
                            { contactNo: { $regex: search, $options: 'i' } }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ]);
            return {
                data,
                totalCount
            };
        });
    }
    // get single sale
    read(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._isExists(id);
            return this.model.findOne({ user: new mongoose_1.Types.ObjectId(userId), _id: id });
        });
    }
}
const sellerServices = new SellerServices(seller_model_1.default, 'seller');
exports.default = sellerServices;
