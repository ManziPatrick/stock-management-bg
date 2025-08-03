"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//@ts-nocheck
const mongoose_1 = require("mongoose");
// Modified measurement schema to be more flexible
const measurementSchema = new mongoose_1.Schema({
    type: {
        type: String,
        required: false
    },
    measurement: {
        type: String,
        required: false
    },
    value: {
        type: Number,
        required: false
    },
    unit: {
        type: String,
        required: true
    }
}, {
    // Allow additional properties
    strict: false
});
const productSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    seller: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Seller'
    },
    category: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'category'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    measurement: measurementSchema,
    brand: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'brand'
    },
    price: {
        type: Number,
        required: true,
        min: [0, 'Price cannot be negative']
    },
    default_price: {
        type: Number,
        required: true,
        min: [0, 'Default price cannot be negative']
    },
    stock: {
        type: Number,
        required: true,
        min: [0, 'Stock cannot be negative']
    },
    // Support for 'quantity' field from frontend (maps to stock)
    quantity: {
        type: Number,
        required: false
    },
    description: {
        type: String,
        trim: true
    },
    // Added updatePurchases field from interface
    updatePurchases: {
        type: Boolean,
        default: false
    },
    // Added isCredit field from frontend payload
    isCredit: {
        type: Boolean,
        default: false
    },
    images: {
        type: [String],
        required: [true, 'At least one product image is required'],
        validate: {
            validator: function (v) {
                return v.length > 0 && v.length <= 5;
            },
            message: 'Product must have between 1 and 5 images'
        }
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true
    }
});
// Add middleware to map quantity to stock if needed
productSchema.pre('save', function (next) {
    if (this.quantity !== undefined && this.stock === undefined) {
        this.stock = this.quantity;
    }
    next();
});
// Add indices for common queries
productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ seller: 1 });
productSchema.index({ price: 1 });
productSchema.index({ category: 1, price: 1 });
// Prevent re-compilation of the model
const Product = (0, mongoose_1.model)('Product', productSchema);
exports.default = Product;
