import { Types, Document } from 'mongoose';

export interface IExpense extends Document {
  title: string;
  amount: number;
  description?: string;
  date: Date;
  createdBy: Types.ObjectId;
  status: 'ACTIVE' | 'ARCHIVED';
  category?: 'FOOD' | 'TRANSPORT' | 'UTILITIES' | 'ENTERTAINMENT' | 'OTHER';
  paymentMethod: 'CASH' | 'CHECK' | 'MOMO' | 'PETTY_CASH';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPettyCash extends Document {
  balance: number;
  lastTopup: Date;
  transactions: {
    date: Date;
    amount: number;
    description: string;
    expenseId?: Types.ObjectId;
    performedBy: Types.ObjectId;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}