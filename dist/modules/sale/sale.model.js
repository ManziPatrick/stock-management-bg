"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const productSaleSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    SellingPrice: { type: Number, required: true },
    quantity: { type: Number, required: true },
    inventoryReserved: { type: Boolean, default: false }
});
const saleTransactionSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    date: { type: Date, required: true },
    paymentMode: {
        type: String,
        enum: ['cash', 'momo', 'cheque', 'transfer'],
        default: 'cash'
    },
    paymentDetails: {
        mode: { type: String, required: true },
        momoNumber: { type: String }
    },
    products: [productSaleSchema],
    transactionId: { type: mongoose_1.Schema.Types.ObjectId, required: true, index: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'credit'],
        default: 'pending'
    },
    inventoryStatus: {
        type: String,
        enum: ['reserved', 'deducted', 'released'],
        default: 'reserved'
    },
    isProductsCollected: { type: Boolean, default: false },
    intendedAsCreditSale: { type: Boolean, default: false },
    debitDetails: {
        paidAmount: { type: Number },
        dueDate: { type: Date },
        buyerPhoneNumber: { type: String },
        buyerEmail: { type: String },
        description: { type: String }
    }
}, { timestamps: true });
const SaleTransaction = mongoose_1.default.model('SaleTransaction', saleTransactionSchema);
exports.default = SaleTransaction;
