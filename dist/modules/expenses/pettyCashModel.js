"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PettyCash = void 0;
const mongoose_1 = require("mongoose");
const pettyCashSchema = new mongoose_1.Schema({
    balance: { type: Number, required: true, default: 0 },
    lastTopup: { type: Date, default: Date.now },
    transactions: [
        {
            date: { type: Date, default: Date.now },
            amount: { type: Number, required: true },
            description: { type: String, required: true },
            expenseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Expense' },
            performedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
        }
    ]
}, { timestamps: true });
// Pre-save hook to ensure balance is never negative
pettyCashSchema.pre('save', function (next) {
    if (this.balance < 0) {
        return next(new Error('Petty cash balance cannot be negative'));
    }
    next();
});
exports.PettyCash = (0, mongoose_1.model)('PettyCash', pettyCashSchema);
