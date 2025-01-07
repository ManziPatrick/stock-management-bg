import { Schema,Types, model, Document } from 'mongoose';
import { IExpense } from './expense.interface';  // Assuming you have an interface for Expense

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    date: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

// Pre-save hook to perform any necessary actions before saving, such as validation
expenseSchema.pre<IExpense>('save', function (next) {
  // Ensure that the amount is always positive
  if (this.amount < 0) {
    return next(new Error('Amount cannot be negative'));
  }
  next();
});

// Create and export the Expense model as a named export
export const Expense = model<IExpense>('Expense', expenseSchema);
export { IExpense };  // Named export for IExpense
