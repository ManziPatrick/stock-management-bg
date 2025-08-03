import { CreditModel, Credit } from './credit.models';
import { AppError } from '../utils/appError';
import { CreateCreditDto, UpdateCreditDto, CreditQueryParams, MakePaymentDto, VerifyDeliveryDto } from './credit.interface';
import Product from '../product/product.model';
import mongoose from 'mongoose';

export class CreditService {
  async createCredit(data: CreateCreditDto, userId: string): Promise<Credit> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate credit amount calculation
      if (data.totalAmount !== data.downPayment + data.creditAmount) {
        throw new AppError('Total amount must equal down payment plus credit amount', 400);
      }

      // Check if product exists and has sufficient stock
      const product = await Product.findById(data.productId).session(session);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      if (product.stock < data.quantity) {
        throw new AppError(`Insufficient stock. Available: ${product.stock}, Requested: ${data.quantity}`, 400);
      }

      // Reserve stock by reducing available stock
      await Product.findByIdAndUpdate(
        data.productId,
        { $inc: { stock: -data.quantity } },
        { session }
      );

      // Create credit record with reserved stock information
      const creditData = {
        ...data,
        reservedStock: data.quantity,
        deliveryStatus: 'RESERVED',
        createdBy: userId
      };

      const credit = await CreditModel.create([creditData], { session });
      
      await session.commitTransaction();
      return credit[0];
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to create credit record', 400);
    } finally {
      session.endSession();
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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingCredit = await CreditModel.findById(id).session(session);
      if (!existingCredit) {
        throw new AppError('Credit record not found', 404);
      }

      // Handle status changes that affect stock
      if (data.status === 'REJECTED' && existingCredit.status !== 'REJECTED') {
        // Return reserved stock to product
        await Product.findByIdAndUpdate(
          existingCredit.productId,
          { $inc: { stock: existingCredit.reservedStock } },
          { session }
        );
        data.deliveryStatus = 'NOT_DELIVERED';
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
        { new: true, runValidators: true, session }
      );

      if (!credit) {
        throw new AppError('Credit record not found', 404);
      }

      await session.commitTransaction();
      return credit;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to update credit record', 400);
    } finally {
      session.endSession();
    }
  }

  async deleteCredit(id: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const credit = await CreditModel.findById(id).session(session);
      if (!credit) {
        throw new AppError('Credit record not found', 404);
      }

      // If credit is not delivered and stock was reserved, return it to product
      if (credit.deliveryStatus === 'RESERVED' && credit.reservedStock > 0) {
        await Product.findByIdAndUpdate(
          credit.productId,
          { $inc: { stock: credit.reservedStock } },
          { session }
        );
      }

      await CreditModel.findByIdAndDelete(id).session(session);
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to delete credit record', 400);
    } finally {
      session.endSession();
    }
  }

  async verifyDelivery(data: VerifyDeliveryDto, verifierId: string): Promise<Credit> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const credit = await CreditModel.findById(data.creditId).session(session);
      if (!credit) {
        throw new AppError('Credit record not found', 404);
      }

      if (credit.deliveryStatus === 'DELIVERED') {
        throw new AppError('Delivery already verified', 400);
      }

      const updateData: any = {
        deliveryStatus: data.deliveryStatus,
        verifiedBy: verifierId,
        verificationDate: new Date()
      };

      // If delivery is not confirmed, return reserved stock to product
      if (data.deliveryStatus === 'NOT_DELIVERED' && credit.reservedStock > 0) {
        await Product.findByIdAndUpdate(
          credit.productId,
          { $inc: { stock: credit.reservedStock } },
          { session }
        );
        updateData.status = 'REJECTED';
      }

      const updatedCredit = await CreditModel.findByIdAndUpdate(
        data.creditId,
        { $set: updateData },
        { new: true, runValidators: true, session }
      );

      if (!updatedCredit) {
        throw new AppError('Failed to update credit record', 500);
      }

      await session.commitTransaction();
      return updatedCredit;
    } catch (error) {
      await session.abortTransaction();
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to verify delivery', 400);
    } finally {
      session.endSession();
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

  async getStockSummary(productId: string) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new AppError('Product not found', 404);
      }

      // Get reserved stock from pending credits
      const reservedStock = await CreditModel.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(productId),
            status: { $in: ['PENDING'] },
            deliveryStatus: 'RESERVED'
          }
        },
        {
          $group: {
            _id: null,
            totalReserved: { $sum: '$reservedStock' }
          }
        }
      ]);

      const totalReserved = reservedStock[0]?.totalReserved || 0;
      const availableStock = product.stock;
      const totalStock = availableStock + totalReserved;

      return {
        productId,
        productName: product.name,
        totalStock,
        availableStock,
        reservedStock: totalReserved,
        deliveredStock: totalStock - availableStock - totalReserved
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get stock summary', 400);
    }
  }

  async getPendingDeliveries(userId?: string) {
    try {
      const query: any = {
        deliveryStatus: 'RESERVED',
        status: 'PENDING'
      };

      // If user is provided, filter by created by user (for non-admin users)
      if (userId) {
        query.createdBy = userId;
      }

      const pendingDeliveries = await CreditModel.find(query)
        .populate('productId', 'name default_price')
        .populate('createdBy', 'name email')
        .populate('verifiedBy', 'name email')
        .sort({ createdAt: -1 });

      return pendingDeliveries;
    } catch (error) {
      throw new AppError('Failed to get pending deliveries', 400);
    }
  }
}

