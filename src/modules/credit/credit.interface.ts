export interface CreditQueryParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }
  
  export interface CreateCreditDto {
    productId: string;
    quantity: number;
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: {
      name: string;
      phone: string;
      email: string;
    };
    paymentDueDate: string;
    status?: 'PENDING' | 'COMPLETED' | 'REJECTED';
    deliveryStatus?: 'NOT_DELIVERED' | 'DELIVERED' | 'RESERVED';
  }
  
  export interface UpdateCreditDto {
    productId?: string;
    quantity?: number;
    totalAmount?: number;
    downPayment?: number;
    creditAmount?: number;
    customerDetails?: {
      name?: string;
      phone?: string;
      email?: string;
    };
    paymentDueDate?: string;
    status?: 'PENDING' | 'COMPLETED' | 'REJECTED';
    deliveryStatus?: 'NOT_DELIVERED' | 'DELIVERED' | 'RESERVED';
  }

  export interface VerifyDeliveryDto {
    creditId: string;
    deliveryStatus: 'DELIVERED' | 'NOT_DELIVERED';
    verificationNotes?: string;
  }
  
  export interface MakePaymentDto {
    amount: number;
    paymentMethod: string;
  }