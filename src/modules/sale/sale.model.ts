import mongoose, { Schema } from 'mongoose';
import { ISaleTransaction } from './sale.interface';

const productSaleSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  productPrice: { type: Number, required: true },
  SellingPrice: { type: Number, required: true },
  quantity: { type: Number, required: true },
  inventoryReserved: { type: Boolean, default: false }
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
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'credit'],
      default: 'pending'
    },
    inventoryStatus: {
      type: String,
      enum: ['reserved', 'deducted', 'released'],
      default: 'reserved'
    },
    isProductsCollected: { type: Boolean, default: false },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'out_for_delivery', 'delivered', 'returned'],
      default: 'pending'
    },
    totalQuantity: { type: Number, default: 0 },
    intendedAsCreditSale: { type: Boolean, default: false },
    debitDetails: {
      paidAmount: { type: Number },
      dueDate: { type: Date },
      buyerPhoneNumber: { type: String },
      buyerEmail: { type: String },
      description: { type: String }
    }
  },
  { timestamps: true }
);

const SaleTransaction = mongoose.model<ISaleTransaction>('SaleTransaction', saleTransactionSchema);
export default SaleTransaction;