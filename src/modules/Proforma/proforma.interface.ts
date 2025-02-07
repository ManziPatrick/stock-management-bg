import { Document } from 'mongoose';

export interface IProformaItem {
  product: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface IBillInfo {
  name: string;
  companyName: string;
  streetAddress: string;
  cityStateZip: string;
  phone: string;
}

interface IInvoiceDetails {
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date;
}

interface ITotals {
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export interface IProforma extends Document {
  billFrom: IBillInfo;
  billTo: IBillInfo;
  date: Date;
  dueDate: Date;
  invoiceNumber: string; // Add this field
  invoiceDetails: IInvoiceDetails;
  items: IProformaItem[];
  terms: {
    paymentDays: number;
    lateFeePercentage: number;
  };
  totals: ITotals;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}