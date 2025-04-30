
import { Types } from 'mongoose';

export interface IMeasurement {
  _id?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUnit {
  _id?: string;
  name: string;
  symbol: string;
  measurementId: Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}