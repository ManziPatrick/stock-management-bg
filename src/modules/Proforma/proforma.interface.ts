import { Document } from 'mongoose';

export interface IProformaItem {
  product: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

interface IInvoiceDetails {
  invoiceNo: string;
  invoiceDate: Date;
}

interface ITotals {
  subtotal: string;
  total: string;
}

export interface IProforma extends Document {
  clientName: string;
  date: Date;
  invoiceNumber: string;
  invoiceDetails: IInvoiceDetails;
  items: IProformaItem[];
  totals: ITotals;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}