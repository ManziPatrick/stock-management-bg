"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MeasurementSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    value: {
        type: Number,
        required: true
    }
}, { _id: false });
const purchaseSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user', index: true },
    seller: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'seller', index: true },
    product: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'product', index: true },
    sellerName: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    paid: { type: Number, default: 0, min: 0 },
    measurement: {
        type: MeasurementSchema,
        required: true
    }
}, { timestamps: true });
// Pre-save hook to automatically calculate total price
purchaseSchema.pre('save', function (next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});
const Purchase = (0, mongoose_1.model)('purchase', purchaseSchema);
exports.default = Purchase;
