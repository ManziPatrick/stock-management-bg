import mongoose, { Schema, Document, Types } from 'mongoose';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import BaseServices from '../baseServices';
import Sale from './sale.model';
import Product from '../product/product.model';
import { Expense } from '../expenses/expenseModel';
import CustomError from '../../errors/customError';

interface ProductPayload {
  product: string;
  productName: string;
  SellingPrice: number;
  productPrice: number;
  quantity: number;
}

interface SalePayload {
  buyerName: string;
  date: string;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
  paymentDetails: {
    mode: string;
  };
  products: ProductPayload[];
}

class SaleServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

  async processSingleSale(item: ProductPayload, transactionId: Types.ObjectId, userId: string, saleDate: Date) {
    if (!item.product) {
      throw new CustomError(400, 'Product is required');
    }
  
    const product = await Product.findById(item.product);
    if (!product) {
      throw new CustomError(404, `Product not found: ${item.product}`);
    }
  
    // Check for sufficient stock
    if (item.quantity > product.stock) {
      throw new CustomError(400, `Only ${product.stock} items of ${product.name} are available in stock`);
    }
  
    // Decrement stock
    await Product.findByIdAndUpdate(product._id, { $inc: { stock: -item.quantity } });
  
    // Calculate total price for this item
    const totalPrice = item.quantity * item.SellingPrice;
  
    // Create sale record
    const sale = await Sale.create({
      user: userId,
      product: item.product,
      productName: item.productName,
      productPrice: item.productPrice,
      SellingPrice: item.SellingPrice,
      quantity: item.quantity,
      totalPrice,
      transactionId,
      date: saleDate
    });
    
    return sale;
  }

  async create(payload: SalePayload, userId: string) {
    try {
      const transactionId = new mongoose.Types.ObjectId();
      const saleDate = new Date(payload.date);
      
      // Process each product in the array
      const salePromises = payload.products.map(item => 
        this.processSingleSale(item, transactionId, userId, saleDate)
      );
      
      const salesResults = await Promise.all(salePromises);

      // Calculate transaction summary
      const transactionSummary = {
        transactionId,
        totalItems: salesResults.length,
        totalQuantity: salesResults.reduce((sum, sale) => sum + sale.quantity, 0),
        totalAmount: salesResults.reduce((sum, sale) => sum + sale.totalPrice, 0),
        totalProfit: salesResults.reduce(
          (sum, sale) => sum + (sale.quantity * (sale.SellingPrice - sale.productPrice)),
          0
        ),
        paymentMode: payload.paymentMode,
        paymentDetails: payload.paymentDetails,
        buyerName: payload.buyerName,
        date: saleDate,
        createdAt: new Date()
      };

      // Calculate statistics
      const totalRevenue = await this.calculateTotalStockRevenue();
      
      // Daily payment stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dailyPaymentStats = await this.calculatePaymentStats({
        createdAt: { $gte: today, $lt: tomorrow }
      });

      // Monthly payment stats
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const monthlyPaymentStats = await this.calculatePaymentStats({
        createdAt: { $gte: startOfMonth, $lte: endOfMonth }
      });

      // All-time payment stats
      const allTimePaymentStats = await this.calculatePaymentStats({});

      // Recent sales
      const recentSales = await this.model.aggregate([
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
        {
          $project: {
            _id: 1,
            transactionId: 1,
            productName: 1,
            buyerName: 1,
            quantity: 1,
            totalPrice: 1,
            paymentMode: 1,
            createdAt: 1,
            profit: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
          }
        }
      ]);

      return {
        transactionSummary,
        sales: salesResults,
        totalRevenue: totalRevenue[0],
        paymentStats: {
          daily: dailyPaymentStats[0] || { cashTotal: 0, momoTotal: 0, chequeTotal: 0, transferTotal: 0, totalAmount: 0 },
          monthly: monthlyPaymentStats[0] || { cashTotal: 0, momoTotal: 0, chequeTotal: 0, transferTotal: 0, totalAmount: 0 },
          allTime: allTimePaymentStats[0] || { cashTotal: 0, momoTotal: 0, chequeTotal: 0, transferTotal: 0, totalAmount: 0 }
        },
        recentSales
      };
    } catch (error: any) {
      console.error('Sale creation error:', error);
      throw new CustomError(400, error.message || 'Sale creation failed');
    }
  }

  // Existing calculation methods remain unchanged
  async calculateTotalStockRevenue() {
    return await Product.aggregate([
      {
        $group: {
          _id: '$size',
          totalRevenue: { $sum: { $multiply: ['$price', '$stock'] } },
          totalStock: { $sum: '$stock' },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { _id: 1 } },
      {
        $group: {
          _id: null,
          sizeWiseRevenue: { $push: '$$ROOT' },
          totalOverallRevenue: { $sum: '$totalRevenue' },
          totalOverallStock: { $sum: '$totalStock' }
        }
      }
    ]);
  }

  async calculatePaymentStats(matchStage: any = {}) {
    return await this.model.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          cashTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] }
          },
          momoTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] }
          },
          chequeTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] }
          },
          transferTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] }
          },
          totalAmount: { $sum: '$totalPrice' }
        }
      }
    ]);
  }



// Add a new method to get sales by transaction ID
async getSalesByTransactionId(transactionId: string) {
  try {
    // Find all sales with this transaction ID
    const sales = await this.model.find({ transactionId })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    
    if (!sales || sales.length === 0) {
      throw new CustomError(404, 'Transaction not found');
    }
    
    // Calculate transaction summary
    const transactionSummary = {
      transactionId,
      totalItems: sales.length,
      totalQuantity: sales.reduce((sum, sale) => sum + sale.quantity, 0),
      totalAmount: sales.reduce((sum, sale) => sum + sale.totalPrice, 0),
      totalProfit: sales.reduce((sum, sale) => 
        sum + (sale.quantity * (sale.SellingPrice - sale.productPrice)), 0
      ),
      paymentMode: sales[0]?.paymentMode,
      buyerName: sales[0]?.buyerName,
      createdAt: sales[0]?.createdAt,
      user: sales[0]?.user
    };
    
    return {
      statusCode: 200,
      success: true,
      message: 'Transaction retrieved successfully',
      data: {
        transactionSummary,
        items: sales
      }
    };
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    throw new CustomError(error.statusCode || 500, error.message);
  }
}

  private async calculateExpenses(userId: string, dateRange?: { startDate: Date; endDate: Date }) {
    console.log('Calculating expenses for:', {
      userId,
      dateRange,
      userIdObject: new Types.ObjectId(userId)
    });

    const matchStage: any = {
      createdBy: new Types.ObjectId(userId),
      status: 'ACTIVE'
    };

    if (dateRange) {
      matchStage.date = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      };
    }

    try {
      const totalExpenses = await Expense.aggregate([
        {
          $match: matchStage
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      console.log('Expense aggregation result:', totalExpenses);

      // If expenses found, return the total, otherwise return 0
      return totalExpenses.length > 0 ? totalExpenses[0].total : 0;
    } catch (error) {
      console.error('Error calculating expenses:', error);
      throw error;
    }
  }


  async readAll(query: Record<string, unknown> = {}) {
    const search = query.search ? (query.search as string) : '';
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;
  
    // Base match stage for search criteria
    const matchStage = {
      $match: {
        $or: [
          { productName: { $regex: search, $options: 'i' } },
          { buyerName: { $regex: search, $options: 'i' } },
        ],
      },
    };
  
    try {
      // Get paginated results first - without population
      const skip = (page - 1) * limit;
      const data = await this.model
        .find(matchStage.$match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      
      // Overall Sales Statistics with Payment Mode Totals
      const [stats] = await this.model.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            totalQuantitySold: { $sum: '$quantity' },
            totalSaleAmount: { $sum: '$totalPrice' },
            totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
            totalProductPrice: { $sum: { $multiply: ['$productPrice', '$quantity'] } },
            totalMarginProfit: {
              $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] },
            },
            averageSaleAmount: { $avg: '$totalPrice' },
            totalCount: { $sum: 1 },
            cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
            momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
            chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
            transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
          },
        },
      ]);
  
      // Rest of the aggregation queries remain the same
      const [dailyStats, monthlyStats, yearlyStats, recentSales] = await Promise.all([
        this.getDailyStats(matchStage),
        this.getMonthlyStats(matchStage),
        this.getYearlyStats(matchStage),
        this.getRecentSales(matchStage)
      ]);

      const totalCount = await this.model.countDocuments(matchStage.$match);
      const [totalRevenue] = await this.model.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: '$totalPrice' },
          },
        },
      ]);

      return {
        statusCode: 200,
        success: true,
        message: 'Sales retrieved successfully!',
        data,
        meta: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          totalSales: {
            stats: stats || {
              totalQuantitySold: 0,
              totalSaleAmount: 0,
              totalSellingPrice: 0,
              totalProductPrice: 0,
              totalMarginProfit: 0,
              profit: 0,
              averageSaleAmount: 0,
              totalCount: 0,
              cashTotal: 0,
              momoTotal: 0,
              chequeTotal: 0,
              transferTotal: 0
            },
            dailyStats,
            monthlyStats,
            yearlyStats,
            recentSales,
            totalRevenue: totalRevenue?.total || 0,
          },
        },
      };
    } catch (error) {
      console.error('Error fetching sales:', error);
      throw new Error('Failed to fetch sales.');
    }
  }

  // Helper methods for stats
  private async getDailyStats(matchStage: any) {
    return this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
            paymentMode: '$paymentMode'
          },
          total: { $sum: '$totalPrice' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          },
          dailyTotal: { $sum: '$total' },
          quantity: { $sum: '$quantity' },
          payments: {
            $push: {
              mode: '$_id.paymentMode',
              total: '$total',
              count: '$count'
            }
          },
          cashTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cash'] },
                '$total',
                0
              ]
            }
          },
          momoTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'momo'] },
                '$total',
                0
              ]
            }
          },
          chequeTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cheque'] },
                '$total',
                0
              ]
            }
          },
          transferTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'transfer'] },
                '$total',
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
  }

  private async getMonthlyStats(matchStage: any) {
    return this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            paymentMode: '$paymentMode'
          },
          total: { $sum: '$totalPrice' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month'
          },
          monthlyTotal: { $sum: '$total' },
          quantity: { $sum: '$quantity' },
          payments: {
            $push: {
              mode: '$_id.paymentMode',
              total: '$total',
              count: '$count'
            }
          },
          cashTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cash'] },
                '$total',
                0
              ]
            }
          },
          momoTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'momo'] },
                '$total',
                0
              ]
            }
          },
          chequeTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cheque'] },
                '$total',
                0
              ]
            }
          },
          transferTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'transfer'] },
                '$total',
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);
  }

  private async getYearlyStats(matchStage: any) {
    return this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            paymentMode: '$paymentMode'
          },
          total: { $sum: '$totalPrice' },
          quantity: { $sum: '$quantity' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: { year: '$_id.year' },
          yearlyTotal: { $sum: '$total' },
          quantity: { $sum: '$quantity' },
          payments: {
            $push: {
              mode: '$_id.paymentMode',
              total: '$total',
              count: '$count'
            }
          },
          cashTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cash'] },
                '$total',
                0
              ]
            }
          },
          momoTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'momo'] },
                '$total',
                0
              ]
            }
          },
          chequeTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'cheque'] },
                '$total',
                0
              ]
            }
          },
          transferTotal: { 
            $sum: { 
              $cond: [
                { $eq: ['$_id.paymentMode', 'transfer'] },
                '$total',
                0
              ]
            }
          }
        }
      },
      { $sort: { '_id.year': -1 } }
    ]);
  }

  private async getRecentSales(matchStage: any) {
    return this.model.aggregate([
      matchStage,
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 1,
          productName: 1,
          buyerName: 1,
          quantity: 1,
          totalPrice: 1,
          paymentMode: 1,
          createdAt: 1,
          profit: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] },
        },
      },
    ]);
  }


  async readAllDaily(query: { startDate?: string; endDate?: string; userId: string }) {
    const { startDate, endDate, userId } = query;
    const startDateTime = startDate ? new Date(startDate) : new Date(new Date().setHours(0, 0, 0, 0));
    const endDateTime = endDate ? new Date(endDate) : new Date(new Date().setHours(23, 59, 59, 999));

    // First get sales stats
    const matchStage = {
      $match: {
        user: new Types.ObjectId(userId),
        createdAt: {
          $gte: startDateTime,
          $lte: endDateTime
        }
      }
    };

    const stats = await this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          totalQuantitySold: { $sum: '$quantity' },
          totalSaleAmount: { $sum: '$totalPrice' },
          totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
          totalProductPrice: { $sum: '$productPrice' },
          profit: { $sum: { $subtract: ['$SellingPrice', '$productPrice'] } },
          totalMarginProfit: {
            $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
          },
          averageSaleAmount: { $avg: '$totalPrice' },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);

    // Now get total expenses for this period
    const expenses = await Expense.aggregate([
      {
        $match: {
          createdBy: new Types.ObjectId(userId),
          status: 'ACTIVE',
          date: {
            $gte: startDateTime,
            $lte: endDateTime
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          dailyExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]);

    // Combine sales and expenses data
    const enrichedStats = stats.map(stat => {
      const matchingExpense = expenses.find(exp => 
        exp._id.year === stat._id.year && 
        exp._id.month === stat._id.month && 
        exp._id.day === stat._id.day
      );

      const dailyExpenses = matchingExpense ? matchingExpense.dailyExpenses : 0;

      return {
        ...stat,
        expenses: dailyExpenses,
        netProfit: stat.totalMarginProfit - dailyExpenses
      };
    });

    return {
      statusCode: 200,
      success: true,
      message: 'Daily sales retrieved successfully!',
      data: enrichedStats
    };
  }

  async readAllMonthly(query: { year?: string; userId: string }) {
    const { year, userId } = query;
    const currentYear = year || new Date().getFullYear().toString();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const matchStage = {
      $match: {
        user: new Types.ObjectId(userId),
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    };

    const stats = await this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalQuantitySold: { $sum: '$quantity' },
          totalSaleAmount: { $sum: '$totalPrice' },
          totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
          totalProductPrice: { $sum: '$productPrice' },
          profit: { $sum: { $subtract: ['$SellingPrice', '$productPrice'] } },
          totalMarginProfit: {
            $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
          },
          averageSaleAmount: { $avg: '$totalPrice' },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    // Get monthly expenses
    const expenses = await Expense.aggregate([
      {
        $match: {
          createdBy: new Types.ObjectId(userId),
          status: 'ACTIVE',
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          monthlyExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      }
    ]);

    const enrichedStats = stats.map(stat => {
      const matchingExpense = expenses.find(exp => 
        exp._id.year === stat._id.year && 
        exp._id.month === stat._id.month
      );

      const monthlyExpenses = matchingExpense ? matchingExpense.monthlyExpenses : 0;

      return {
        ...stat,
        expenses: monthlyExpenses,
        netProfit: stat.totalMarginProfit - monthlyExpenses
      };
    });

    return {
      statusCode: 200,
      success: true,
      message: 'Monthly sales retrieved successfully!',
      data: enrichedStats
    };
  }




  async readAllWeekly(userId: string) {
    const totalExpenses = await this.calculateExpenses(userId);
    const totalRevenue = await this.calculateTotalStockRevenue();

    const weeklyData = await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { week: { $isoWeek: '$date' }, year: { $isoWeekYear: '$date' } },
          totalQuantity: { $sum: '$quantity' },
          totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
          totalProductPrice: { $sum: '$productPrice' },
          totalExpenses: { $first: totalExpenses },
        },
      },
      {
        $addFields: {
          totalProfit: {
            $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
          }
        },
      },
      
      {
        $sort: { '_id.year': 1, '_id.week': 1 },
      },
    ]);

    return {
      weeklyData,
      totalRevenue: totalRevenue[0]
    };
  }

  async readById(id: string) {
    const result = await this.model.findById(id);
    if (!result) {
      throw new CustomError(404, 'Sale not found');
    }
    const totalRevenue = await this.calculateTotalStockRevenue();
    
    return {
      sale: result,
      totalRevenue: totalRevenue[0]
    };
  }

 

  async getTotalPurchasedAmount() {
    const result = await this.model.aggregate([
      {
        $group: {
          _id: null,
          totalPurchasedAmount: { $sum: '$totalPrice' }
        }
      }
    ]);

    // Return the aggregated total or 0 if no purchases are found
    return result.length > 0 ? result[0].totalPurchasedAmount : 0;
  }

  async readAllYearly(query: { startYear?: string; endYear?: string; userId: string }) {
    const { startYear, endYear, userId } = query;
    const currentYear = new Date().getFullYear().toString();
    
    // Set default date range if not provided
    const startDate = startYear ? new Date(`${startYear}-01-01`) : new Date(`${currentYear}-01-01`);
    const endDate = endYear 
      ? new Date(`${endYear}-12-31T23:59:59.999Z`) 
      : new Date(`${currentYear}-12-31T23:59:59.999Z`);

    const matchStage = {
      $match: {
        user: new Types.ObjectId(userId),
        createdAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    };

    // Get yearly sales statistics
    const stats = await this.model.aggregate([
      matchStage,
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' }
          },
          totalQuantitySold: { $sum: '$quantity' },
          totalSaleAmount: { $sum: '$totalPrice' },
          totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
          totalProductPrice: { $sum: '$productPrice' },
          profit: { $sum: { $subtract: ['$SellingPrice', '$productPrice'] } },
          totalMarginProfit: {
            $sum: { $multiply: ['$quantity', { $subtract: ['$SellingPrice', '$productPrice'] }] }
          },
          averageSaleAmount: { $avg: '$totalPrice' },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalPrice', 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalPrice', 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalPrice', 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalPrice', 0] } }
        }
      },
      { $sort: { '_id.year': -1 } }
    ]);

    // Get yearly expenses
    const expenses = await Expense.aggregate([
      {
        $match: {
          createdBy: new Types.ObjectId(userId),
          status: 'ACTIVE',
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' }
          },
          yearlyExpenses: { $sum: '$amount' }
        }
      },
      {
        $sort: { '_id.year': -1 }
      }
    ]);

    // Combine sales and expenses data
    const enrichedStats = stats.map(stat => {
      const matchingExpense = expenses.find(exp => exp._id.year === stat._id.year);
      const yearlyExpenses = matchingExpense ? matchingExpense.yearlyExpenses : 0;

      return {
        ...stat,
        expenses: yearlyExpenses,
        netProfit: stat.totalMarginProfit - yearlyExpenses
      };
    });

    return {
      statusCode: 200,
      success: true,
      message: 'Yearly sales retrieved successfully!',
      data: enrichedStats
    };
  }
}


  
  


const saleServices = new SaleServices(Sale, 'Sale');
export default saleServices;