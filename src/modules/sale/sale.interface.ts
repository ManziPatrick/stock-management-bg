import { Types } from 'mongoose';

export interface ISale {
  user: Types.ObjectId;
  product: Types.ObjectId;
  productName: string;
  productPrice: number;
  quantity: number;
  SellingPrice:number,
  buyerName: string;
  date: Date;
  totalPrice: number;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
}

export interface ProfitCalculationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface ProfitSummary {
  totalSales: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}
