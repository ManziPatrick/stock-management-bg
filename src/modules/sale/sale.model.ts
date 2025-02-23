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

// Define the Sale schema
const saleSchema = new Schema<ISale>(
  {
    productName: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    productPrice: { type: Number, required: true },
    SellingPrice: { type: Number, required: true }, // ✅ Updated name
    totalPrice: { type: Number, required: true },
    buyerName: { type: String },
    date: { type: Date, required: true }, // ✅ Added missing field
    paymentMode: {
      type: String,
      enum: ['cash', 'momo', 'cheque', 'transfer'],
      default: 'cash',
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: { type: Schema.Types.ObjectId, required: true, index: true },
  },
  { timestamps: true } // ✅ Ensures createdAt & updatedAt exist
);

// Add compound index for optimized queries
saleSchema.index({ transactionId: 1, createdAt: -1 });

// Define and export the Sale model
const Sale = mongoose.model<ISale>('Sale', saleSchema);
export default Sale;
