// src/interfaces/DeliveryNote.interface.ts

import { Document } from 'mongoose';

export interface IDeliveryNoteItem {
  productId?: string;
  particulars: string;
  quantity: number;
}

export interface IDeliveryNote {
  id: string;
  date: Date;
  customerName: string;
  items: IDeliveryNoteItem[];
  deliveredBy?: string;
  receivedBy?: string;
  proofOfDeliveryUrl?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  deliveredAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDeliveryNoteCreate {
  id?: string;
  date?: Date;
  customerName: string;
  items: IDeliveryNoteItem[];
  deliveredBy?: string;
  receivedBy?: string;
  proofOfDeliveryUrl?: string;
  status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  createdBy?: string;
}

export interface IDeliveryNoteUpdate {
  date?: Date;
  customerName?: string;
  items?: IDeliveryNoteItem[];
  deliveredBy?: string;
  receivedBy?: string;
  proofOfDeliveryUrl?: string;
  status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  deliveredAt?: Date;
}

export interface IDeliveryNoteQuery {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  customerName?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  status?: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
}