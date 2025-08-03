import { Types } from 'mongoose';

// This interface is meant to be flexible
export interface IMeasurement {
  type?: string;
  measurement?: string; // Alternative field name
  value?: number;
  unit: string;
  [key: string]: any; // Allow any other properties
}

export interface IProduct {
  user: Types.ObjectId;
  seller: Types.ObjectId;
  category: Types.ObjectId;
  name: string;
  measurement?: IMeasurement;
  brand?: Types.ObjectId;
  price: number; // Original price - only visible to ADMIN and SUPER_ADMIN
  default_price: number; // Default selling price - visible to all users
  stock: number;
  description?: string;
  updatePurchases?: boolean;
  images: string[];
  createdAt?: Date;
  updatedAt?: Date;
}