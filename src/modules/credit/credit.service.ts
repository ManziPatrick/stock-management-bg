import { CreditModel, Credit } from './credit.models';
import { AppError } from '../utils/appError';
import { CreateCreditDto, UpdateCreditDto, CreditQueryParams, MakePaymentDto } from './credit.interface';

export class CreditService {
  async createCredit(data: CreateCreditDto): Promise<Credit> {
    try {
      // Validate credit amount calculation
      if (data.totalAmount !== data.downPayment + data.creditAmount) {
        throw new AppError('Total amount must equal down payment plus credit amount', 400);
      }

      const credit = await CreditModel.create(data);
      return credit;
    } catch (error) {
      if (error instanceof AppError) throw error;
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
    const existingCredit = await CreditModel.findById(id);
    if (!existingCredit) {
      throw new AppError('Credit record not found', 404);
    }

    if (data.status === 'COMPLETED') {
      data.creditAmount = 0;
      data.downPayment = existingCredit.totalAmount;
    }

    // Validate total amount if being updated
    if (data.totalAmount || data.downPayment || data.creditAmount) {
      const newTotal = data.totalAmount ?? existingCredit.totalAmount;
      const newDownPayment = data.downPayment ?? existingCredit.downPayment;
      const newCreditAmount = data.creditAmount ?? existingCredit.creditAmount;

      if (newTotal !== newDownPayment + newCreditAmount) {
        throw new AppError('Total amount must equal down payment plus credit amount', 400);
      }
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

  async makePayment(creditId: string, paymentData: MakePaymentDto): Promise<Credit> {
    const credit = await CreditModel.findById(creditId);
    if (!credit) {
      throw new AppError('Credit record not found', 404);
    }

    if (credit.status === 'REJECTED') {
      throw new AppError('Cannot make payment on rejected credit', 400);
    }

    if (credit.status === 'COMPLETED') {
      throw new AppError('Credit is already fully paid', 400);
    }

    if (paymentData.amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }

    if (paymentData.amount > credit.creditAmount) {
      throw new AppError(`Payment amount exceeds remaining credit amount of ${credit.creditAmount}`, 400);
    }

    const newCreditAmount = credit.creditAmount - paymentData.amount;
    const newDownPayment = credit.downPayment + paymentData.amount;
    const newStatus = newCreditAmount === 0 ? 'COMPLETED' : 'PENDING';

    const updatedCredit = await CreditModel.findByIdAndUpdate(
      creditId,
      {
        $set: {
          creditAmount: newCreditAmount,
          downPayment: newDownPayment,
          status: newStatus
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedCredit) {
      throw new AppError('Failed to update credit record', 500);
    }

    return updatedCredit;
  }
}

