"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const categorySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user' },
    name: { type: String, required: true }
}, { timestamps: true });
const Category = (0, mongoose_1.model)('category', categorySchema);
exports.default = Category;
