import { Types } from "mongoose";

export interface IMeasurement {
  type: 'weight' | 'length' | 'volume' | 'size' | 'pieces';
  value?: number;
  unit: string;
}

export interface IProduct {
  user: Types.ObjectId;
  name: string;
  seller: Types.ObjectId;
  category: Types.ObjectId;
  brand?: Types.ObjectId;
  measurement?: IMeasurement;
  
  price: number;
  stock: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  
}

interface ProductCreateResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: IProduct;
}
