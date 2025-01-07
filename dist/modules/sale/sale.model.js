"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const saleSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user' },
    product: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'product' },
    buyerName: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    SellingPrice: { type: Number, required: true },
    date: { type: Date, required: true }
}, { timestamps: true });
const Sale = (0, mongoose_1.model)('sale', saleSchema);
exports.default = Sale;
