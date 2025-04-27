import mongoose, { Schema } from 'mongoose';
import { ISaleTransaction } from './sale.interface';

const productSaleSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true },
  SellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true }
});

const saleTransactionSchema = new Schema<ISaleTransaction>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    date: { type: Date, required: true },
    paymentMode: {
      type: String,
      enum: ['cash', 'momo', 'cheque', 'transfer'],
      default: 'cash'
    },
    paymentDetails: {
      mode: { type: String, required: true },
      momoNumber: { type: String }
    },
    products: [productSaleSchema],
    transactionId: { type: Schema.Types.ObjectId, required: true, index: true },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'credit'],
      default: 'pending'
    }
  },
  { timestamps: true }
);

const SaleTransaction = mongoose.model<ISaleTransaction>('SaleTransaction', saleTransactionSchema);
export default SaleTransaction;