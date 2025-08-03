import { Types } from 'mongoose';

export interface IProductSale {
  product: Types.ObjectId;
  productName: string;
  productPrice: number;
  SellingPrice: number;
  default_price:number;
  quantity: number;
  // Track inventory status
  inventoryReserved: boolean; // Whether inventory was reserved on creation
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
  paidAmount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'credit';
  // New fields for inventory tracking
  inventoryStatus: 'reserved' | 'deducted' | 'released'; // Track inventory state
  isProductsCollected: boolean; // Whether customer has taken the products
  deliveryStatus?: 'pending' | 'out_for_delivery' | 'delivered' | 'returned';
  totalQuantity: number; // Total quantity of products in the sale
  createdAt: Date;
  updatedAt: Date;
  
  // Store original intent for credit sales
  intendedAsCreditSale?: boolean;
  debitDetails?: {
    paidAmount?: number;
    dueDate: Date;
    buyerPhoneNumber: string;
    buyerEmail?: string;
    description?: string;
  };
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
    product: string;
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