"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const sellerSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user' },
    name: { type: String, required: true },
    email: { type: String, required: true },
    contactNo: { type: String, required: true }
}, { timestamps: true });
const Seller = (0, mongoose_1.model)('Seller', sellerSchema);
exports.default = Seller;
