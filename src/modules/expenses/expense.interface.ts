export interface IExpense extends Document {
    title: string;
    amount: number;
    description?: string;
    date: Date;
    createdBy: Types.ObjectId;
    status: 'ACTIVE' | 'ARCHIVED';
    createdAt?: Date;
    updatedAt?: Date;
  }