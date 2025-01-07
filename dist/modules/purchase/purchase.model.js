"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const purchaseSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user' },
    seller: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'seller' },
    product: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'product' },
    sellerName: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    paid: { type: Number, default: 0 }
}, { timestamps: true });
const Purchase = (0, mongoose_1.model)('purchase', purchaseSchema);
exports.default = Purchase;
