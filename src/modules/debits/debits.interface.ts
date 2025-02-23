export interface IDebit {
  _id: string;
  productName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  buyerName: string;
  buyerPhoneNumber: string;  // Updated
  buyerEmail: string;  // Updated
  saleId: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// DTOs
export interface CreateDebitDto {
  productName: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  dueDate: Date;
  buyerName: string;
  buyerPhoneNumber: string;
  buyerEmail: string;
  saleId: string;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  description?: string;
}

export interface UpdateDebitDto {
  paidAmount?: number;
  remainingAmount?: number;
  dueDate?: Date;
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  description?: string;
  buyerPhoneNumber?: string;
  buyerEmail?: string;
}

export interface DebitQueryParams {
  page?: number;
  limit?: number;
  status?: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  search?: string;
  startDate?: Date;
  endDate?: Date;
}
