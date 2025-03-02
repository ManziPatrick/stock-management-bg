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
  };
  products: IProductSale[];
  transactionId: Types.ObjectId;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
