"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const expenseSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'user', required: true },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
}, { timestamps: true });
// Pre-save hook to perform any necessary actions before saving, such as validation
expenseSchema.pre('save', function (next) {
    // Ensure that the amount is always positive
    if (this.amount < 0) {
        return next(new Error('Amount cannot be negative'));
    }
    next();
});
// Create and export the Expense model as a named export
exports.Expense = (0, mongoose_1.model)('Expense', expenseSchema);
