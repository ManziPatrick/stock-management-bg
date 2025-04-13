import { Schema, model } from 'mongoose';
import { IExpense } from './expense.interface';

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
    category: { 
      type: String, 
      enum: ['FOOD', 'TRANSPORT', 'UTILITIES', 'ENTERTAINMENT', 'OTHER'],
      default: 'OTHER'
    },
    paymentMethod: { 
      type: String, 
      enum: ['CASH', 'CHECK', 'MOMO', 'PETTY_CASH'],
      required: true
    }
  },
  { timestamps: true }
);

expenseSchema.pre<IExpense>('save', function (next) {
 
  if (this.amount < 0) {
    return next(new Error('Amount cannot be negative'));
  }
  next();
});

export const Expense = model<IExpense>('Expense', expenseSchema);
export { IExpense };  // Named export for IExpense