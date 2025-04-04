import { IProforma } from './proforma.interface';
import Proforma from './proforma.model';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

interface ProformaQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export class ProformaService {
  private generateInvoiceNumber(): string {
    return `INV${new Date().getFullYear()}${(new Date().getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${uuidv4().slice(0, 8).toUpperCase()}`;
  }

  async createProforma(proformaData: Partial<IProforma>): Promise<IProforma> {
    try {
      const invoiceNo = this.generateInvoiceNumber();
      
      // Prepare the proforma data with generated invoice number
      const preparedData = {
        ...proformaData,
        invoiceNumber: invoiceNo,
        date: new Date(),
        status: 'draft',
        invoiceDetails: {
          invoiceNo: invoiceNo,
          invoiceDate: new Date()
        }
      };

      const proforma = new Proforma(preparedData);
      await proforma.save();
      return proforma;
    } catch (error) {
      throw error;
    }
  }

  async getAllProformas(queryParams: ProformaQueryParams) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = queryParams;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'invoiceDetails.invoiceNo': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const [proformas, total] = await Promise.all([
      Proforma.find(query)
        .populate({
          path: 'items.product',
          select: 'name price'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Proforma.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: proformas,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<IProforma> {
    const proforma = await Proforma.findById(id).populate('items.product');
    if (!proforma) throw new Error('Proforma not found');
    return proforma;
  }

  async updateStatus(id: string, status: IProforma['status']): Promise<IProforma> {
    const proforma = await Proforma.findById(id);
    if (!proforma) throw new Error('Proforma not found');
    proforma.status = status;
    return proforma.save();
  }

  async update(id: string, updateData: Partial<IProforma>): Promise<IProforma> {
    try {
      const proforma = await Proforma.findById(id);
      if (!proforma) {
        throw new Error('Proforma not found');
      }

      // Don't allow modification of invoice number
      if (updateData.invoiceNumber || updateData.invoiceDetails?.invoiceNo) {
        throw new Error('Invoice number cannot be modified');
      }

      // Update the proforma
      Object.assign(proforma, updateData);
      await proforma.save();
      return proforma;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const proforma = await Proforma.findById(id);
      if (!proforma) throw new Error('Proforma not found');
      if (proforma.status !== 'draft') throw new Error('Only draft Proformas can be deleted');

      await proforma.deleteOne();
    } catch (error) {
      throw error;
    }
  }
}