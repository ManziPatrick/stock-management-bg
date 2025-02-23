/* eslint-disable @typescript-eslint/no-explicit-any */
import { Types } from 'mongoose';
import BaseServices from '../baseServices';
import CustomError  from '../utils/customError'
import { IPurchase } from './purchase.interface';
import Purchase from './purchase.model';
import '../product/product.model'; // Ensures the model is registered

import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import mongoose from 'mongoose'
import Product from '../product/product.model';
class PurchaseServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  /**
   * Create new sale and decrease product stock
   */
  async create(payload: IPurchase, userId: string) {
    const { unitPrice, quantity } = payload;
    payload.user = new Types.ObjectId(userId);
    payload.totalPrice = unitPrice * quantity;

    return this.model.create(payload);
  }

  /**
   * Read all purchases of user
   */
  async getAll(query: Record<string, unknown>) {
    const search = query.search ? query.search : '';

    const data = await this.model.aggregate([
      {
        $match: {
          $or: [
            { sellerName: { $regex: search, $options: 'i' } },
            { productName: { $regex: search, $options: 'i' } }
          ]
        }
      },
      ...sortAndPaginatePipeline(query)
    ]);
    const result = await this.model.aggregate([
      {
        $group: {
          _id: null,
          totalPurchasedAmount: { $sum: '$totalPrice' }
        }
      }
    ]);

    const totalCount = await this.model.find().countDocuments();

    return { data, totalCount, result };
  }

  /**
   * Get total sum of purchased products
   */
  async getTotalPurchasedAmount() {
    const result = await this.model.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalPurchasedAmount: { $sum: '$totalPrice' },
                totalCount: { $sum: 1 },
                averageAmount: { $avg: '$totalPrice' },
                minAmount: { $min: '$totalPrice' },
                maxAmount: { $max: '$totalPrice' }
              }
            }
          ],
          yearly: [
            {
              $group: {
                _id: { year: { $year: '$createdAt' } },
                yearlyTotal: { $sum: '$totalPrice' },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1 } }
          ],
          monthly: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' }
                },
                monthlyTotal: { $sum: '$totalPrice' },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
          ],
          daily: [
            {
              $group: {
                _id: {
                  year: { $year: '$createdAt' },
                  month: { $month: '$createdAt' },
                  day: { $dayOfMonth: '$createdAt' }
                },
                dailyTotal: { $sum: '$totalPrice' },
                count: { $sum: 1 }
              }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
            { $limit: 30 } // Last 30 days
          ],
          recentPurchases: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
              $project: {
                _id: 1,
                productName: 1,
                sellerName: 1,
                totalPrice: 1,
                quantity: 1,
                createdAt: 1
              }
            }
          ]
        }
      },
      {
        $project: {
          stats: { $arrayElemAt: ['$totalStats', 0] },
          yearlyStats: '$yearly',
          monthlyStats: '$monthly',
          dailyStats: '$daily',
          recentPurchases: 1
        }
      }
    ]);

    // If no data exists, return default structure
    if (!result.length) {
      return {
        stats: {
          totalPurchasedAmount: 0,
          totalCount: 0,
          averageAmount: 0,
          minAmount: 0,
          maxAmount: 0
        },
        yearlyStats: [],
        monthlyStats: [],
        dailyStats: [],
        recentPurchases: []
      };
    }

    return result[0];
  }

  /**
   * Get daily purchase statistics
   */
  async getDailyPurchases(date?: string | Date) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.model.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalAmount: { $sum: '$totalPrice' },
                totalPurchases: { $sum: 1 },
                averageAmount: { $avg: '$totalPrice' },
                maxTransaction: { $max: '$totalPrice' },
                minTransaction: { $min: '$totalPrice' }
              }
            }
          ],
          hourlyBreakdown: [
            {
              $group: {
                _id: { $hour: '$createdAt' },
                amount: { $sum: '$totalPrice' },
                count: { $sum: 1 },
                purchases: { $push: '$$ROOT' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          topProducts: [
            {
              $group: {
                _id: '$productName',
                totalAmount: { $sum: '$totalPrice' },
                quantity: { $sum: '$quantity' },
                count: { $sum: 1 }
              }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
          ],
          topSellers: [
            {
              $group: {
                _id: '$sellerName',
                totalAmount: { $sum: '$totalPrice' },
                salesCount: { $sum: 1 }
              }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 5 }
          ],
          recentPurchases: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                _id: 1,
                productName: 1,
                sellerName: 1,
                quantity: 1,
                unitPrice: 1,
                totalPrice: 1,
                createdAt: 1
              }
            }
          ]
        }
      },
      {
        $project: {
          date: startOfDay,
          summary: { $arrayElemAt: ['$summary', 0] },
          hourlyBreakdown: 1,
          topProducts: 1,
          topSellers: 1,
          recentPurchases: 1
        }
      }
    ]);

    // If no data exists, return default structure
    if (!result.length) {
      return {
        date: startOfDay,
        summary: {
          totalAmount: 0,
          totalPurchases: 0,
          averageAmount: 0,
          maxTransaction: 0,
          minTransaction: 0
        },
        hourlyBreakdown: [],
        topProducts: [],
        topSellers: [],
        recentPurchases: []
      };
    }

    return result[0];
  }
  async getDailyComparison(date?: string | Date) {
    const targetDate = date ? new Date(date) : new Date();
    const previousDate = new Date(targetDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const [currentDay, previousDay] = await Promise.all([
      this.getDailyPurchases(targetDate),
      this.getDailyPurchases(previousDate)
    ]);

    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / previous) * 100;
    };

    return {
      currentDay,
      previousDay,
      comparison: {
        amountGrowth: calculateGrowth(
          currentDay.summary?.totalAmount || 0,
          previousDay.summary?.totalAmount || 0
        ),
        purchaseCountGrowth: calculateGrowth(
          currentDay.summary?.totalPurchases || 0,
          previousDay.summary?.totalPurchases || 0
        ),
        averageAmountGrowth: calculateGrowth(
          currentDay.summary?.averageAmount || 0,
          previousDay.summary?.averageAmount || 0
        )
      }
    };
  }



  /**
   * Get monthly purchase statistics
   */
  async getMonthlyPurchases(year?: number, month?: number) {
    const targetDate = new Date();
    const targetYear = year || targetDate.getFullYear();
    const targetMonth = month || targetDate.getMonth() + 1;
  
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
  
    const result = await this.model.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfMonth,
            $lte: endOfMonth
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$totalPrice' },
          count: { $sum: 1 },
          weightedSum: { $sum: { $multiply: [{ $dayOfMonth: '$createdAt' }, '$totalPrice'] } }, // Direct multiplication
          dailyStats: {
            $push: {
              day: { $dayOfMonth: '$createdAt' },
              amount: '$totalPrice'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id.year',
          month: '$_id.month',
          totalAmount: 1,
          count: 1,
          weightedSum: 1, // Include direct multiplication sum
          dailyStats: 1
        }
      }
    ]);
  
    return result[0] || { totalAmount: 0, count: 0, weightedSum: 0, dailyStats: [] };
  }
  

  /**
   * Get yearly purchase statistics
   */
  async getYearlyPurchases(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const result = await this.model.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYear,
            $lte: endOfYear
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalAmount: { $sum: '$totalPrice' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.year',
          totalAmount: { $sum: '$totalAmount' },
          totalCount: { $sum: '$count' },
          monthlyStats: {
            $push: {
              month: '$_id.month',
              amount: '$totalAmount',
              count: '$count'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          year: '$_id',
          totalAmount: 1,
          totalCount: 1,
          monthlyStats: 1
        }
      }
    ]);

    return result[0] || { totalAmount: 0, totalCount: 0, monthlyStats: [] };
  }
  async update(productId: string, payload: any) {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      console.log("🔄 Searching for purchase with productId:", productId);
      
      const existingPurchase = await Purchase.findOne({ product: productId });
      
      if (!existingPurchase) {
        throw new CustomError(404, 'No purchase found for the given product ID');
      }
  
      // Create update object
      const updateFields: any = {};
  
      // Handle basic fields
      if (payload.unitPrice !== undefined) updateFields.unitPrice = payload.unitPrice;
      if (payload.quantity !== undefined) updateFields.quantity = payload.quantity;
      if (payload.paid !== undefined) updateFields.paid = payload.paid;
  
      // Handle measurement object
      if (payload.measurement) {
        updateFields.measurement = {
          type: payload.measurement.type,
          unit: payload.measurement.unit,
          value: payload.measurement.value
        };
      }
  
      // Calculate new total price if quantity or unitPrice changed
      if (payload.quantity !== undefined || payload.unitPrice !== undefined) {
        const newQuantity = payload.quantity ?? existingPurchase.quantity;
        const newUnitPrice = payload.unitPrice ?? existingPurchase.unitPrice;
        updateFields.totalPrice = newQuantity * newUnitPrice;
      }
  
      // Perform the update
      const updatedPurchase = await Purchase.findOneAndUpdate(
        { product: productId },
        { $set: updateFields },
        { 
          new: true, 
          session,
          runValidators: true 
        }
      );
  
      if (!updatedPurchase) {
        throw new CustomError(404, 'Purchase not found after update');
      }
  
      await session.commitTransaction();
      console.log("✅ Purchase updated successfully");
  
      return {
        success: true,
        statusCode: 200,
        message: 'Purchase updated successfully',
        data: updatedPurchase
      };
  
    } catch (error) {
      await session.abortTransaction();
      console.error("❌ Error updating purchase:", error);
      
      if (error instanceof CustomError) throw error;
      throw new CustomError(400, 'Purchase update failed');
    } finally {
      session.endSession();
    }
  }


/**
 * Handle updates from product service
 */
static async handleProductUpdate(
    productId: string,
    updates: any,
    session: mongoose.ClientSession
) {
    console.log("📢 Processing purchase updates for product:", productId);

    const purchases = await Purchase.find({ 
        product: productId,
        stockAddition: { $ne: true } 
    }).session(session);

    console.log("🛒 Purchases found:", purchases.length);

    if (purchases.length > 0) {
        const purchaseUpdates = purchases.map(async (purchase:any) => {
            const updates: any = {};

            // Update price only if it has changed
            if (updates.price && updates.price !== purchase.unitPrice) {
                updates.unitPrice = updates.price;
                updates.totalPrice = updates.price * purchase.quantity;
            }

            // Update measurement only if it has changed
            if (updates.measurement && 
                JSON.stringify(updates.measurement) !== JSON.stringify(purchase.measurement)) {
                updates.measurement = updates.measurement;
            }

            if (Object.keys(updates).length > 0) {
                console.log(`🔄 Updating purchase ${purchase._id} with:`, updates);
                return Purchase.findByIdAndUpdate(purchase._id, updates, { session });
            }
            console.log(`⚠️ No changes needed for purchase ${purchase._id}`);
            return null;
        });

        await Promise.all(purchaseUpdates);
        console.log("✅ Purchase sync completed");
    } else {
        console.log("⚠️ No purchases found for this product. Skipping purchase update.");
    }
}



}

const purchaseServices = new PurchaseServices(Purchase, 'Purchase');
export default purchaseServices;
