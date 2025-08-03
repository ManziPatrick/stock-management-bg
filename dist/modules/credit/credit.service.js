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
exports.CreditService = void 0;
const credit_models_1 = require("./credit.models");
const appError_1 = require("../utils/appError");
const product_model_1 = __importDefault(require("../product/product.model"));
const mongoose_1 = __importDefault(require("mongoose"));
class CreditService {
    createCredit(data, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                // Validate credit amount calculation
                if (data.totalAmount !== data.downPayment + data.creditAmount) {
                    throw new appError_1.AppError('Total amount must equal down payment plus credit amount', 400);
                }
                // Check if product exists and has sufficient stock
                const product = yield product_model_1.default.findById(data.productId).session(session);
                if (!product) {
                    throw new appError_1.AppError('Product not found', 404);
                }
                if (product.stock < data.quantity) {
                    throw new appError_1.AppError(`Insufficient stock. Available: ${product.stock}, Requested: ${data.quantity}`, 400);
                }
                // Reserve stock by reducing available stock
                yield product_model_1.default.findByIdAndUpdate(data.productId, { $inc: { stock: -data.quantity } }, { session });
                // Create credit record with reserved stock information
                const creditData = Object.assign(Object.assign({}, data), { reservedStock: data.quantity, deliveryStatus: 'RESERVED', createdBy: userId });
                const credit = yield credit_models_1.CreditModel.create([creditData], { session });
                yield session.commitTransaction();
                return credit[0];
            }
            catch (error) {
                yield session.abortTransaction();
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to create credit record', 400);
            }
            finally {
                session.endSession();
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
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const existingCredit = yield credit_models_1.CreditModel.findById(id).session(session);
                if (!existingCredit) {
                    throw new appError_1.AppError('Credit record not found', 404);
                }
                // Handle status changes that affect stock
                if (data.status === 'REJECTED' && existingCredit.status !== 'REJECTED') {
                    // Return reserved stock to product
                    yield product_model_1.default.findByIdAndUpdate(existingCredit.productId, { $inc: { stock: existingCredit.reservedStock } }, { session });
                    data.deliveryStatus = 'NOT_DELIVERED';
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
                const credit = yield credit_models_1.CreditModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true, session });
                if (!credit) {
                    throw new appError_1.AppError('Credit record not found', 404);
                }
                yield session.commitTransaction();
                return credit;
            }
            catch (error) {
                yield session.abortTransaction();
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to update credit record', 400);
            }
            finally {
                session.endSession();
            }
        });
    }
    deleteCredit(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const credit = yield credit_models_1.CreditModel.findById(id).session(session);
                if (!credit) {
                    throw new appError_1.AppError('Credit record not found', 404);
                }
                // If credit is not delivered and stock was reserved, return it to product
                if (credit.deliveryStatus === 'RESERVED' && credit.reservedStock > 0) {
                    yield product_model_1.default.findByIdAndUpdate(credit.productId, { $inc: { stock: credit.reservedStock } }, { session });
                }
                yield credit_models_1.CreditModel.findByIdAndDelete(id).session(session);
                yield session.commitTransaction();
            }
            catch (error) {
                yield session.abortTransaction();
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to delete credit record', 400);
            }
            finally {
                session.endSession();
            }
        });
    }
    verifyDelivery(data, verifierId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const credit = yield credit_models_1.CreditModel.findById(data.creditId).session(session);
                if (!credit) {
                    throw new appError_1.AppError('Credit record not found', 404);
                }
                if (credit.deliveryStatus === 'DELIVERED') {
                    throw new appError_1.AppError('Delivery already verified', 400);
                }
                const updateData = {
                    deliveryStatus: data.deliveryStatus,
                    verifiedBy: verifierId,
                    verificationDate: new Date()
                };
                // If delivery is not confirmed, return reserved stock to product
                if (data.deliveryStatus === 'NOT_DELIVERED' && credit.reservedStock > 0) {
                    yield product_model_1.default.findByIdAndUpdate(credit.productId, { $inc: { stock: credit.reservedStock } }, { session });
                    updateData.status = 'REJECTED';
                }
                const updatedCredit = yield credit_models_1.CreditModel.findByIdAndUpdate(data.creditId, { $set: updateData }, { new: true, runValidators: true, session });
                if (!updatedCredit) {
                    throw new appError_1.AppError('Failed to update credit record', 500);
                }
                yield session.commitTransaction();
                return updatedCredit;
            }
            catch (error) {
                yield session.abortTransaction();
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to verify delivery', 400);
            }
            finally {
                session.endSession();
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
    getStockSummary(productId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const product = yield product_model_1.default.findById(productId);
                if (!product) {
                    throw new appError_1.AppError('Product not found', 404);
                }
                // Get reserved stock from pending credits
                const reservedStock = yield credit_models_1.CreditModel.aggregate([
                    {
                        $match: {
                            productId: new mongoose_1.default.Types.ObjectId(productId),
                            status: { $in: ['PENDING'] },
                            deliveryStatus: 'RESERVED'
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalReserved: { $sum: '$reservedStock' }
                        }
                    }
                ]);
                const totalReserved = ((_a = reservedStock[0]) === null || _a === void 0 ? void 0 : _a.totalReserved) || 0;
                const availableStock = product.stock;
                const totalStock = availableStock + totalReserved;
                return {
                    productId,
                    productName: product.name,
                    totalStock,
                    availableStock,
                    reservedStock: totalReserved,
                    deliveredStock: totalStock - availableStock - totalReserved
                };
            }
            catch (error) {
                if (error instanceof appError_1.AppError)
                    throw error;
                throw new appError_1.AppError('Failed to get stock summary', 400);
            }
        });
    }
    getPendingDeliveries(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = {
                    deliveryStatus: 'RESERVED',
                    status: 'PENDING'
                };
                // If user is provided, filter by created by user (for non-admin users)
                if (userId) {
                    query.createdBy = userId;
                }
                const pendingDeliveries = yield credit_models_1.CreditModel.find(query)
                    .populate('productId', 'name default_price')
                    .populate('createdBy', 'name email')
                    .populate('verifiedBy', 'name email')
                    .sort({ createdAt: -1 });
                return pendingDeliveries;
            }
            catch (error) {
                throw new appError_1.AppError('Failed to get pending deliveries', 400);
            }
        });
    }
}
exports.CreditService = CreditService;
