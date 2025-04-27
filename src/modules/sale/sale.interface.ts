// sale.interface.ts - Updated
import { Types } from 'mongoose';

export interface IProductSale {
  product: Types.ObjectId;
  productName: string;
  productPrice: number;
  SellingPrice: number;
  quantity: number;
}

export interface ISaleTransaction {
  user: Types.ObjectId;
  buyerName: string;
  date: Date;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
  paymentDetails: {
    mode: string;
    momoNumber?: string;
  };
  products: IProductSale[];
  transactionId: Types.ObjectId;
  totalAmount: number;
  paidAmount?: number; // Added field for credit sales
  status: 'pending' | 'approved' | 'rejected' | 'credit';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSalePayload {
  buyerName: string;
  date: string | Date;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
  paymentDetails: {
    mode: string;
    momoNumber?: string;
  };
  products: Array<{
    product: string; // Product ID
    quantity: number;
    SellingPrice: number;
  }>;
  status?: 'pending' | 'approved' | 'rejected' | 'credit';
  debitDetails?: {
    paidAmount?: number;
    dueDate: string | Date;
    buyerPhoneNumber: string;
    buyerEmail?: string;
    description?: string;
  };
}