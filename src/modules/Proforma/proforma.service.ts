import { IProforma } from './proforma.interface';
import Proforma from './proforma.model';
import Product from '../product/product.model';
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Generate the invoice number first
      const invoiceNo = this.generateInvoiceNumber();
      console.log('invoiceNo', invoiceNo);
      
      // Use provided dates or generate new ones
      const issueDate = proformaData.date || new Date();
      const paymentDays = proformaData.terms?.paymentDays || 30;
      const dueDate = proformaData.dueDate || new Date(issueDate.getTime() + (paymentDays * 24 * 60 * 60 * 1000));

      // Prepare proforma data with guaranteed invoice number
      const preparedData = {
        ...proformaData,
        date: issueDate,
        dueDate: dueDate,
        invoiceNumber: invoiceNo,
        invoiceDetails: {
          invoiceNo: invoiceNo,
          invoiceDate: issueDate,
          dueDate: dueDate
        },
        terms: {
          paymentDays: paymentDays,
          lateFeePercentage: proformaData.terms?.lateFeePercentage || 5
        }
      };

      // Validate and update product stock
      if (preparedData.items && preparedData.items.length > 0) {
        for (const item of preparedData.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) {
            throw new Error(`Product ${item.product} not found`);
          }
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }
          // Update product stock
          product.stock -= item.quantity;
          await product.save({ session });
        }
      }

      const proforma = new Proforma(preparedData);
      await proforma.save({ session });
      await session.commitTransaction();
      return proforma;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
        { 'billTo.name': { $regex: search, $options: 'i' } },
        { 'billFrom.name': { $regex: search, $options: 'i' } },
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
          select: 'name price stock'
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const proforma = await Proforma.findById(id).session(session);
      if (!proforma) {
        throw new Error('Proforma not found');
      }

      // Don't allow modification of invoice number
      if (updateData.invoiceNumber || updateData.invoiceDetails?.invoiceNo) {
        throw new Error('Invoice number cannot be modified');
      }

      // If updating items, check and update product stock
      if (updateData.items) {
        // Restore original stock
        for (const item of proforma.items) {
          const product = await Product.findById(item.product).session(session);
          if (product) {
            product.stock += item.quantity;
            await product.save({ session });
          }
        }

        // Validate and update new stock
        for (const item of updateData.items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) {
            throw new Error(`Product ${item.product} not found`);
          }
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product ${product.name}`);
          }
          product.stock -= item.quantity;
          await product.save({ session });
        }
      }

      // Update the proforma
      Object.assign(proforma, updateData);
      await proforma.save({ session });
      
      await session.commitTransaction();
      return proforma;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async delete(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const proforma = await Proforma.findById(id).session(session);
      if (!proforma) throw new Error('Proforma not found');
      if (proforma.status !== 'draft') throw new Error('Only draft Proformas can be deleted');

      // Restore product stock
      for (const item of proforma.items) {
        const product = await Product.findById(item.product).session(session);
        if (product) {
          product.stock += item.quantity;
          await product.save({ session });
        }
      }

      await proforma.deleteOne({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}