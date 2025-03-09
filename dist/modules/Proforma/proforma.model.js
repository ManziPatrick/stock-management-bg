"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const billInfoSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    companyName: { type: String, required: true },
    streetAddress: { type: String, required: true },
    cityStateZip: { type: String, required: true },
    phone: { type: String, required: true }
});
const proformaItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    price: { type: Number, required: true, min: [0, 'Price cannot be negative'] },
    total: { type: Number, required: true }
});
const proformaSchema = new mongoose_1.Schema({
    billFrom: billInfoSchema,
    billTo: billInfoSchema,
    date: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    invoiceDetails: {
        invoiceNo: { type: String, required: true },
        invoiceDate: { type: Date, required: true },
        dueDate: { type: Date, required: true }
    },
    items: [proformaItemSchema],
    terms: {
        paymentDays: { type: Number, required: true, default: 30 },
        lateFeePercentage: { type: Number, required: true, default: 5 }
    },
    totals: {
        subtotal: { type: String, required: true },
        salesTax: { type: String, required: true },
        other: { type: String, required: true, default: "0.00" },
        total: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'cancelled'],
        default: 'draft'
    }
}, { timestamps: true });
const Proforma = (0, mongoose_1.model)('Proforma', proformaSchema);
exports.default = Proforma;
