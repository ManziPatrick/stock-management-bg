// src/services/credit.service.ts
import { CreditModel, Credit } from './credit.models';
import { AppError } from '../utils/appError';

interface CreditQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface CreateCreditDto {
  productId: string;
  totalAmount: number;
  downPayment: number;
  creditAmount: number;
  customerDetails: {
    name: string;
    phone: string;
    email: string;
  };
  paymentDueDate: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
}

interface UpdateCreditDto {
  productId?: string;
  totalAmount?: number;
  downPayment?: number;
  creditAmount?: number;
  customerDetails?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  paymentDueDate?: string;
  status?: 'PENDING' | 'COMPLETED' | 'REJECTED';
}

export class CreditService {
  async createCredit(data: CreateCreditDto): Promise<Credit> {
    try {
      const credit = await CreditModel.create(data);
      return credit;
    } catch (error) {
      throw new AppError('Failed to create credit record', 400);
    }
  }

  async getAllCredits(queryParams: CreditQueryParams) {
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
        { 'customerDetails.name': { $regex: search, $options: 'i' } },
        { 'customerDetails.email': { $regex: search, $options: 'i' } },
        { productId: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate && endDate) {
      query.paymentDueDate = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const skip = (page - 1) * limit;

    const [credits, total] = await Promise.all([
      CreditModel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CreditModel.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: credits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getCreditById(id: string): Promise<Credit> {
    const credit = await CreditModel.findById(id);
    if (!credit) {
      throw new AppError('Credit record not found', 404);
    }
    return credit;
  }
  async updateCredit(id: string, data: UpdateCreditDto): Promise<Credit> {
    // If status is being updated to COMPLETED, set creditAmount to 0 and equalize downPayment with totalAmount
    if (data.status === 'COMPLETED') {
      data.creditAmount = 0;
      
      // Fetch existing credit details
      const existingCredit = await CreditModel.findById(id);
      if (!existingCredit) {
        throw new AppError('Credit record not found', 404);
      }

      // Ensure downPayment equals totalAmount when completed
      data.downPayment = existingCredit.totalAmount;
    }

    const credit = await CreditModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!credit) {
      throw new AppError('Credit record not found', 404);
    }

    return credit;
  }

  async deleteCredit(id: string): Promise<void> {
    const result = await CreditModel.findByIdAndDelete(id);
    if (!result) {
      throw new AppError('Credit record not found', 404);
    }
  }

  async updatePendingApplications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await CreditModel.updateMany(
      {
        status: 'PENDING',
        createdAt: { $lt: thirtyDaysAgo },
      },
      {
        $set: { status: 'REJECTED' },
      }
    );
  }

  async getCreditSummary() {
    const summary = await CreditModel.aggregate([
      {
        $group: {
          _id: '$status',
          totalAmount: { $sum: '$totalAmount' },
          totalCredit: { $sum: '$creditAmount' },
          totalDownPayment: { $sum: '$downPayment' },
          count: { $sum: 1 },
        },
      },
    ]);
    return summary;
  }
}