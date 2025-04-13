import { Schema, model } from 'mongoose';
import { IPettyCash } from './expense.interface';

const pettyCashSchema = new Schema<IPettyCash>(
  {
    balance: { type: Number, required: true, default: 0 },
    lastTopup: { type: Date, default: Date.now },
    transactions: [
      {
        date: { type: Date, default: Date.now },
        amount: { type: Number, required: true },
        description: { type: String, required: true },
        expenseId: { type: Schema.Types.ObjectId, ref: 'Expense' },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
      }
    ]
  },
  { timestamps: true }
);

// Pre-save hook to ensure balance is never negative
pettyCashSchema.pre<IPettyCash>('save', function (next) {
  if (this.balance < 0) {
    return next(new Error('Petty cash balance cannot be negative'));
  }
  next();
});

export const PettyCash = model<IPettyCash>('PettyCash', pettyCashSchema);