"use strict";
// src/services/debit.service.ts
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
exports.DebitService = void 0;
const debits_models_1 = require("./debits.models");
const appError_1 = require("../utils/appError");
class DebitService {
    createDebit(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const debit = yield debits_models_1.DebitModel.create(data);
                return debit;
            }
            catch (error) {
                throw new appError_1.AppError('Failed to create debit record', 400);
            }
        });
    }
    getAllDebits(queryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, status, search, startDate, endDate, } = queryParams;
            const query = {};
            if (status) {
                query.status = status;
            }
            if (search) {
                query.$or = [
                    { buyerName: { $regex: search, $options: 'i' } },
                    { productName: { $regex: search, $options: 'i' } },
                ];
            }
            if (startDate && endDate) {
                query.dueDate = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }
            const skip = (page - 1) * limit;
            const [debits, total] = yield Promise.all([
                debits_models_1.DebitModel.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                debits_models_1.DebitModel.countDocuments(query),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                data: debits,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            };
        });
    }
    getDebitById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const debit = yield debits_models_1.DebitModel.findById(id);
            if (!debit) {
                throw new appError_1.AppError('Debit record not found', 404);
            }
            return debit;
        });
    }
    updateDebit(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const debit = yield debits_models_1.DebitModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
            if (!debit) {
                throw new appError_1.AppError('Debit record not found', 404);
            }
            if (debit.remainingAmount === 0) {
                debit.status = 'COMPLETED';
                yield debit.save();
            }
            return debit;
        });
    }
    deleteDebit(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield debits_models_1.DebitModel.findByIdAndDelete(id);
            if (!result) {
                throw new appError_1.AppError('Debit record not found', 404);
            }
        });
    }
    updateOverdueStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const today = new Date();
            yield debits_models_1.DebitModel.updateMany({
                status: 'PENDING',
                dueDate: { $lt: today },
            }, {
                $set: { status: 'OVERDUE' },
            });
        });
    }
    getDebitSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const summary = yield debits_models_1.DebitModel.aggregate([
                {
                    $group: {
                        _id: '$status',
                        totalAmount: { $sum: '$totalAmount' },
                        totalRemaining: { $sum: '$remainingAmount' },
                        count: { $sum: 1 },
                    },
                },
            ]);
            return summary;
        });
    }
}
exports.DebitService = DebitService;
