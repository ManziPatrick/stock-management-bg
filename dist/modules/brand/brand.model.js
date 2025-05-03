"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const brandSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, required: true, ref: 'user' },
    name: { type: String, required: true }
});
const Brand = (0, mongoose_1.model)('brand', brandSchema);
exports.default = Brand;
