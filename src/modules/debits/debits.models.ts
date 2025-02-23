import { Schema, model } from 'mongoose';
import { IDebit } from './debits.interface';

const debitSchema = new Schema<IDebit>(
  {
    productName: { type: String, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    buyerName: { type: String, required: true },
    buyerPhoneNumber: { type: String, required: true },  // Updated from 'number'
    buyerEmail: { type: String, required: true },  // Updated from 'email'
    saleId: { type: Schema.Types.String, ref: 'Sale', required: true },
    status: { type: String, enum: ['PENDING', 'COMPLETED', 'OVERDUE'], default: 'PENDING' },
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Create indexes for better performance
debitSchema.index({ buyerName: 1 });
debitSchema.index({ status: 1 });
debitSchema.index({ dueDate: 1 });

export const DebitModel = model<IDebit>('Debit', debitSchema);

