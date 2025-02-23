import mongoose, { Schema, Document, Types } from 'mongoose';

// Define the Sale interface
export interface ISale {
  user: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  productPrice: number;
  quantity: number;
  SellingPrice: number; // ✅ Renamed from "SellingPrice" for consistency
  buyerName?: string;
  date: Date; // ✅ Added missing field
  totalPrice: number;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
  transactionId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Define the Profit Calculation Query interface
export interface ProfitCalculationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

// Define the Profit Summary interface
export interface ProfitSummary {
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}