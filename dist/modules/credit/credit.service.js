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
exports.CreditService = void 0;
const credit_models_1 = require("./credit.models");
const appError_1 = require("../utils/appError");
class CreditService {
    createCredit(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate credit amount calculation
                if (data.totalAmount !== data.downPayment + data.creditAmount) {
                    throw new appError_1.AppError('Total amount must equal down payment plus credit amount', 400);
                }
                const credit = yield credit_models_1.CreditModel.create(data);
                return credit;
            }
            catch (error) {
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to create credit record', 400);
            }
        });
    }
    getAllCredits(queryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, status, search, startDate, endDate, } = queryParams;
            const query = {};
            if (status) {
                query.status = status;
            }
            if (search) {
                query.$or = [
                    { 'customerDetails.name': { $regex: search, $options: 'i' } },
                    { 'customerDetails.email': { $regex: search, $options: 'i' } },
                    { productId: { $regex: search, $options: 'i' } },
                ];
            }
            if (startDate && endDate) {
                query.paymentDueDate = {
                    $gte: startDate,
                    $lte: endDate,
                };
            }
            const skip = (page - 1) * limit;
            const [credits, total] = yield Promise.all([
                credit_models_1.CreditModel.find(query)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                credit_models_1.CreditModel.countDocuments(query),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                data: credits,
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
    getCreditById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const credit = yield credit_models_1.CreditModel.findById(id);
            if (!credit) {
                throw new appError_1.AppError('Credit record not found', 404);
            }
            return credit;
        });
    }
    updateCredit(id, data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const existingCredit = yield credit_models_1.CreditModel.findById(id);
            if (!existingCredit) {
                throw new appError_1.AppError('Credit record not found', 404);
            }
            if (data.status === 'COMPLETED') {
                data.creditAmount = 0;
                data.downPayment = existingCredit.totalAmount;
            }
            // Validate total amount if being updated
            if (data.totalAmount || data.downPayment || data.creditAmount) {
                const newTotal = (_a = data.totalAmount) !== null && _a !== void 0 ? _a : existingCredit.totalAmount;
                const newDownPayment = (_b = data.downPayment) !== null && _b !== void 0 ? _b : existingCredit.downPayment;
                const newCreditAmount = (_c = data.creditAmount) !== null && _c !== void 0 ? _c : existingCredit.creditAmount;
                if (newTotal !== newDownPayment + newCreditAmount) {
                    throw new appError_1.AppError('Total amount must equal down payment plus credit amount', 400);
                }
            }
            const credit = yield credit_models_1.CreditModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
            if (!credit) {
                throw new appError_1.AppError('Credit record not found', 404);
            }
            return credit;
        });
    }
    deleteCredit(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield credit_models_1.CreditModel.findByIdAndDelete(id);
            if (!result) {
                throw new appError_1.AppError('Credit record not found', 404);
            }
        });
    }
    updatePendingApplications() {
        return __awaiter(this, void 0, void 0, function* () {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            yield credit_models_1.CreditModel.updateMany({
                status: 'PENDING',
                createdAt: { $lt: thirtyDaysAgo },
            }, {
                $set: { status: 'REJECTED' },
            });
        });
    }
    getCreditSummary() {
        return __awaiter(this, void 0, void 0, function* () {
            const summary = yield credit_models_1.CreditModel.aggregate([
                {
                    $group: {
                        _id: '$status',
                        totalAmount: { $sum: '$totalAmount' },
                        totalCredit: { $sum: '$creditAmount' },
                        totalDownPayment: { $sum: '$downPayment' },
                        count: { $sum: 1 },
                    },
                },
            ]);
            return summary;
        });
    }
    makePayment(creditId, paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            const credit = yield credit_models_1.CreditModel.findById(creditId);
            if (!credit) {
                throw new appError_1.AppError('Credit record not found', 404);
            }
            if (credit.status === 'REJECTED') {
                throw new appError_1.AppError('Cannot make payment on rejected credit', 400);
            }
            if (credit.status === 'COMPLETED') {
                throw new appError_1.AppError('Credit is already fully paid', 400);
            }
            if (paymentData.amount <= 0) {
                throw new appError_1.AppError('Payment amount must be greater than 0', 400);
            }
            if (paymentData.amount > credit.creditAmount) {
                throw new appError_1.AppError(`Payment amount exceeds remaining credit amount of ${credit.creditAmount}`, 400);
            }
            const newCreditAmount = credit.creditAmount - paymentData.amount;
            const newDownPayment = credit.downPayment + paymentData.amount;
            const newStatus = newCreditAmount === 0 ? 'COMPLETED' : 'PENDING';
            const updatedCredit = yield credit_models_1.CreditModel.findByIdAndUpdate(creditId, {
                $set: {
                    creditAmount: newCreditAmount,
                    downPayment: newDownPayment,
                    status: newStatus
                }
            }, { new: true, runValidators: true });
            if (!updatedCredit) {
                throw new appError_1.AppError('Failed to update credit record', 500);
            }
            return updatedCredit;
        });
    }
}
exports.CreditService = CreditService;
