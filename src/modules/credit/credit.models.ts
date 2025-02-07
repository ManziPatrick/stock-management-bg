import { Schema, model, Document } from 'mongoose';

interface CustomerDetails {
    name: string;
    phone: string;
    email: string;
}

interface Credit extends Document {
    productId: string;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: CustomerDetails;
    paymentDueDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const CustomerDetailsSchema = new Schema<CustomerDetails>({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true }
});

const CreditSchema = new Schema<Credit>({
    productId: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    downPayment: { type: Number, required: true },
    creditAmount: { type: Number, required: true },
    customerDetails: { type: CustomerDetailsSchema, required: true },
    paymentDueDate: { type: String, required: true },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], required: true }
});

const CreditModel = model<Credit>('Credit', CreditSchema);

export { CreditModel, Credit };