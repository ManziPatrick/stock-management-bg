// src/services/debit.service.ts

import { DebitModel } from './debits.models';
import { CreateDebitDto, UpdateDebitDto, DebitQueryParams, IDebit } from './debits.interface';
import {AppError} from '../utils/appError';

export class DebitService {
  async createDebit(data: CreateDebitDto): Promise<IDebit> {
    try {
      const debit = await DebitModel.create(data);
      return debit;
    } catch (error) {
      throw new AppError('Failed to create debit record', 400);
    }
  }

  async getAllDebits(queryParams: DebitQueryParams) {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      startDate,
      endDate,
    } = queryParams;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { buyerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate && endDate) {
      query.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const [debits, total] = await Promise.all([
      DebitModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      DebitModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: debits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getDebitById(id: string): Promise<IDebit> {
    const debit = await DebitModel.findById(id);
    if (!debit) {
      throw new AppError('Debit record not found', 404);
    }
    return debit;
  }

  async updateDebit(id: string, data: UpdateDebitDto): Promise<IDebit> {
    const debit = await DebitModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!debit) {
      throw new AppError('Debit record not found', 404);
    }


    if (debit.remainingAmount === 0) {
      debit.status = 'COMPLETED';
      await debit.save();
    }

    return debit;
  }

  async deleteDebit(id: string): Promise<void> {
    const result = await DebitModel.findByIdAndDelete(id);
    if (!result) {
      throw new AppError('Debit record not found', 404);
    }
  }

  async updateOverdueStatus(): Promise<void> {
    const today = new Date();
    await DebitModel.updateMany(
      {
        status: 'PENDING',
        dueDate: { $lt: today },
      },
      {
        $set: { status: 'OVERDUE' },
      }
    );
  }

  async getDebitSummary() {
    const summary = await DebitModel.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalAmount' },
          totalRemaining: { $sum: '$remainingAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return summary;
  }
}