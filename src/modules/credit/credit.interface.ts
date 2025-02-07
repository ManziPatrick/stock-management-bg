export interface CustomerDetails {
    name: string;
    phone: string;
    email: string;
}

export interface Credit {
    productId: string;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: CustomerDetails;
    paymentDueDate: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}