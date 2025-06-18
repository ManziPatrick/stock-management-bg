"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const matchStagePipeline = (query, userId) => {
    let minPrice = 0;
    let maxPrice = Number.MAX_VALUE;
    if (query.minPrice) {
        minPrice = Number(query.minPrice);
    }
    if (query.maxPrice) {
        maxPrice = Number(query.maxPrice);
    }
    const fieldQuery = [{ user: new mongoose_1.Types.ObjectId(userId) }, { price: { $gte: minPrice, $lte: maxPrice } }];
    if (query.name) {
        fieldQuery.push({ name: { $regex: new RegExp(query.name, 'i') } });
    }
    if (query.category) {
        const isValidId = mongoose_1.Types.ObjectId.isValid(query.category);
        if (isValidId) {
            fieldQuery.push({ category: { $eq: new mongoose_1.Types.ObjectId(query.category) } });
        }
    }
    if (query.brand) {
        const isValidId = mongoose_1.Types.ObjectId.isValid(query.brand);
        if (isValidId) {
            fieldQuery.push({ brand: { $eq: new mongoose_1.Types.ObjectId(query.brand) } });
        }
    }
    return [
        {
            $match: {
                $and: [...fieldQuery]
            }
        }
    ];
};
exports.default = matchStagePipeline;
