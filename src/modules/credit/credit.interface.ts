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
    totalAmount: number;
    downPayment: number;
    creditAmount: number;
    customerDetails: {
      name: string;
      phone: string;
      email: string;
    };
    paymentDueDate: string;
    status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  }
  
  export interface UpdateCreditDto {
    productId?: string;
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
  }
  
  export interface MakePaymentDto {
    amount: number;
    paymentMethod: string;
  }