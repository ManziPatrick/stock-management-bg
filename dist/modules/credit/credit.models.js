"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const CreditSchema = new mongoose_1.Schema({
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    downPayment: {
        type: Number,
        required: true,
        min: 0
    },
    creditAmount: {
        type: Number,
        required: true,
        min: 0
    },
    customerDetails: {
        name: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true
        }
    },
    paymentDueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'REJECTED'],
        default: 'PENDING'
    },
    deliveryStatus: {
        type: String,
        enum: ['NOT_DELIVERED', 'DELIVERED', 'RESERVED'],
        default: 'RESERVED'
    },
    reservedStock: {
        type: Number,
        required: true,
        min: 0
    },
    verifiedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user'
    },
    verificationDate: {
        type: Date
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }
}, {
    timestamps: true
});
exports.CreditModel = mongoose_1.default.model('Credit', CreditSchema);
