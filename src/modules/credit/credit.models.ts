import mongoose, { Schema, Document } from 'mongoose';

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
}

export interface Credit extends Document {
  productId: string;
  quantity: number;
  totalAmount: number;
  downPayment: number;
  creditAmount: number;
  customerDetails: CustomerDetails;
  paymentDueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  deliveryStatus: 'NOT_DELIVERED' | 'DELIVERED' | 'RESERVED';
  reservedStock: number; // Stock reserved for this credit transaction
  verifiedBy?: string; // Storekeeper who verified the delivery
  verificationDate?: Date;
  createdBy: string; // User who created the credit
  createdAt: Date;
  updatedAt: Date;
}

const CreditSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
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
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  verificationDate: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'user',
    required: true
  }
}, {
  timestamps: true
});

export const CreditModel = mongoose.model<Credit>('Credit', CreditSchema);
