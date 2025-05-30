"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const MeasurementSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: [true, 'Measurement type is required'],
        trim: true
    },
    unit: {
        type: String,
        required: [true, 'Measurement unit is required'],
        trim: true
    },
    value: {
        type: Number,
        required: [true, 'Measurement value is required'],
        min: [0, 'Measurement value must be positive']
    }
}, { _id: false });
const purchaseSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Types.ObjectId, required: true, ref: 'User', index: true },
    seller: { type: mongoose_1.Types.ObjectId, required: true, ref: 'Seller', index: true },
    product: { type: mongoose_1.Types.ObjectId, required: true, ref: 'Product', index: true },
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
purchaseSchema.pre('save', function (next) {
    this.totalPrice = this.quantity * this.unitPrice;
    next();
});
const Purchase = (0, mongoose_1.model)('Purchase', purchaseSchema);
exports.default = Purchase;
