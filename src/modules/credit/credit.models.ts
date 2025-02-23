import mongoose, { Schema, Document } from 'mongoose';

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
}

export interface Credit extends Document {
  productId: string;
  totalAmount: number;
  downPayment: number;
  creditAmount: number;
  customerDetails: CustomerDetails;
  paymentDueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
}

const CreditSchema = new Schema({
  productId: {
    type: String,
    required: true
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
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'REJECTED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

export const CreditModel = mongoose.model<Credit>('Credit', CreditSchema);
