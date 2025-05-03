"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit = exports.Measurement = void 0;
// src/models/measurement.model.ts
const mongoose_1 = require("mongoose");
const measurementSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Measurement name is required'],
        trim: true,
        unique: true
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});
const unitSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Unit name is required'],
        trim: true
    },
    symbol: {
        type: String,
        required: [true, 'Unit symbol is required'],
        trim: true
    },
    measurementId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Measurement',
        required: [true, 'Measurement ID is required']
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});
// Create compound index to ensure uniqueness of unit name within a measurement
unitSchema.index({ name: 1, measurementId: 1 }, { unique: true });
unitSchema.index({ symbol: 1, measurementId: 1 }, { unique: true });
exports.Measurement = (0, mongoose_1.model)('Measurement', measurementSchema);
exports.Unit = (0, mongoose_1.model)('Unit', unitSchema);
