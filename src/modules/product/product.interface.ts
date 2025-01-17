import { Types } from 'mongoose';

export interface IMeasurement {
  type: 'weight' | 'length' | 'volume' | 'size' | 'pieces';
  value?: number;
  unit: string;
}

export interface IProduct {
  user: Types.ObjectId;
  seller: Types.ObjectId;
  category: Types.ObjectId;
  name: string;
  measurement?: IMeasurement;
  brand?: Types.ObjectId;
  price: number;
  stock: number;
  description?: string;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
}