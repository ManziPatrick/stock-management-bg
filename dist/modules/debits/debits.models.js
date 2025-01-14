"use strict";
// src/models/debit.model.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebitModel = void 0;
const mongoose_1 = require("mongoose");
const debitSchema = new mongoose_1.Schema({
    productName: {
        type: String,
        required: true,
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    paidAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    remainingAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    dueDate: {
        type: Date,
        required: true,
    },
    buyerName: {
        type: String,
        required: true,
    },
    saleId: {
        type: mongoose_1.Schema.Types.String,
        ref: 'Sale',
        required: true,
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'OVERDUE'],
        default: 'PENDING',
    },
    description: {
        type: String,
    },
}, {
    timestamps: true,
    versionKey: false,
});
// Create indexes for better query performance
debitSchema.index({ buyerName: 1 });
debitSchema.index({ status: 1 });
debitSchema.index({ dueDate: 1 });
exports.DebitModel = (0, mongoose_1.model)('Debit', debitSchema);
