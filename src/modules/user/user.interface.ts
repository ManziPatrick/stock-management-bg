import { Schema } from 'mongoose';
import { TUserRole, TUserStatus } from '../../constant/userRole';

export interface IBusinessInfo {
  businessName?: string;
  businessAddress?: string;
  businessPhone?: string;
}

export interface IUser {
  _id?: Schema.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  title?: string;
  description?: string;
  avatar?: string;
  role: TUserRole;
  status: TUserStatus;
  address?: string;
  phone?: string;
  city?: string;
  country?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  instagram?: string;
  businessInfo?: IBusinessInfo;
  createdBy?: Schema.Types.ObjectId;
}
