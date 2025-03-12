import mongoose, { Types } from 'mongoose';
import BaseServices from '../baseServices';
import SaleTransaction from './sale.model';
import Product from '../product/product.model';
import CustomError from '../../errors/customError';
import { IProductSale } from './sale.interface';

import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';

import Sale from './sale.model';

import { Expense } from '../expenses/expenseModel';

interface CreateSalePayload {
  buyerName: string;
  date: string;
  paymentMode: 'cash' | 'momo' | 'cheque' | 'transfer';
  paymentDetails: {
    mode: string;
  };
  products: IProductSale[];
}

class SaleServices extends BaseServices<any> {
  constructor() {
    super(SaleTransaction, 'SaleTransaction');
  }

  private async processProduct(product: IProductSale): Promise<IProductSale> {
    const existingProduct = await Product.findById(product.product);
    if (!existingProduct) {
      throw new CustomError(404, `Product not found: ${product.product}`);
    }

    if (product.quantity > existingProduct.stock) {
      throw new CustomError(400, `Insufficient stock for ${existingProduct.name}`);
    }

    await Product.findByIdAndUpdate(
      existingProduct._id,
      { $inc: { stock: -product.quantity } }
    );

    return {
      ...product,
      productName: existingProduct.name,
      productPrice: existingProduct.price
    };
  }

  async create(payload: CreateSalePayload, userId: string) {
    try {
      const transactionId = new mongoose.Types.ObjectId();
      const saleDate = new Date(payload.date);

      // Process all products
      const processedProducts = await Promise.all(
        payload.products.map(product => this.processProduct(product))
      );

      // Calculate total amount
      const totalAmount = processedProducts.reduce(
        (sum, product) => sum + (product.quantity * product.SellingPrice),
        0
      );

      // Create sale transaction
      const saleTransaction = await SaleTransaction.create({
        user: userId,
        buyerName: payload.buyerName,
        date: saleDate,
        paymentMode: payload.paymentMode,
        paymentDetails: payload.paymentDetails,
        products: processedProducts,
        transactionId,
        totalAmount
      });

      // Calculate additional statistics
      const statistics = await this.calculateStatistics(userId);

      return {
        transaction: saleTransaction,
        statistics
      };
    } catch (error: any) {
      throw new CustomError(400, error.message || 'Failed to create sale');
    }
  }

  private async calculateStatistics(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyStats = await SaleTransaction.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    return {
      daily: dailyStats[0] || { totalSales: 0, transactionCount: 0 }
    };
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
            $sum: { $cond: [{ $eq: ['$paymentMode', 'cash'] }, '$totalAmount', 0] }
          },
          momoTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'momo'] }, '$totalAmount', 0] }
          },
          chequeTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'cheque'] }, '$totalAmount', 0] }
          },
          transferTotal: {
            $sum: { $cond: [{ $eq: ['$paymentMode', 'transfer'] }, '$totalAmount', 0] }
          },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
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
  const userId = query.userId as string;

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
        $unwind: "$products"  // Unwind the products array
      },
      {
        $group: {
          _id: null,
          totalQuantitySold: { $sum: "$products.quantity" },
          totalSaleAmount: { $sum: "$totalAmount" },
          totalSellingPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] } 
          },
          totalProductPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.productPrice"] } 
          },
          totalMarginProfit: {
            $sum: { 
              $multiply: [
                "$products.quantity", 
                { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
              ] 
            }
          },
          averageSaleAmount: { $avg: "$totalAmount" },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
        }
      }
    ]);

    // Get expenses for the entire period
    const totalExpenses = await this.calculateExpenses(userId);
    
    // Add expenses to stats
    const statsWithExpenses = stats ? {
      ...stats,
      expenses: totalExpenses,
      netProfit: stats.totalMarginProfit - totalExpenses
    } : {
      totalQuantitySold: 0,
      totalSaleAmount: 0,
      totalSellingPrice: 0,
      totalProductPrice: 0,
      totalMarginProfit: 0,
      expenses: totalExpenses,
      netProfit: -totalExpenses,
      averageSaleAmount: 0,
      totalCount: 0,
      cashTotal: 0,
      momoTotal: 0,
      chequeTotal: 0,
      transferTotal: 0
    };
  
    // Rest of the aggregation queries
    const [dailyStats, monthlyStats, yearlyStats, recentSales] = await Promise.all([
      this.getDailyStats(matchStage),
      this.getMonthlyStats(matchStage),
      this.getYearlyStats(matchStage),
      this.getRecentSales(matchStage)
    ]);
    
    // Add expenses to dailyStats
    const dailyStatsWithExpenses = await this.addExpensesToDailyStats(dailyStats, userId);
    
    // Add expenses to monthlyStats
    const monthlyStatsWithExpenses = await this.addExpensesToMonthlyStats(monthlyStats, userId);
    
    // Add expenses to yearlyStats
    const yearlyStatsWithExpenses = await this.addExpensesToYearlyStats(yearlyStats, userId);

    const totalCount = await this.model.countDocuments(matchStage.$match);
    const [totalRevenue] = await this.model.aggregate([
      matchStage, // Add this to filter results based on the search
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
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
          stats: statsWithExpenses,
          dailyStats: dailyStatsWithExpenses,
          monthlyStats: monthlyStatsWithExpenses,
          yearlyStats: yearlyStatsWithExpenses,
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

// Helper methods to add expenses to stats
private async addExpensesToDailyStats(dailyStats: any[], userId: string) {
  if (!dailyStats || dailyStats.length === 0) return [];
  
  // Extract all unique dates from sales
  const dates = dailyStats.map(stat => ({
    year: stat._id.year,
    month: stat._id.month,
    day: stat._id.day
  }));
  
  // Get all daily expenses for these dates
  const dailyExpenses = await Expense.aggregate([
    {
      $match: {
        createdBy: new Types.ObjectId(userId),
        status: 'ACTIVE'
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
    }
  ]);
  
  // Combine with dailyStats
  return dailyStats.map(stat => {
    const matchingExpense = dailyExpenses.find(exp => 
      exp._id.year === stat._id.year && 
      exp._id.month === stat._id.month && 
      exp._id.day === stat._id.day
    );
    
    const expenses = matchingExpense ? matchingExpense.dailyExpenses : 0;
    
    return {
      ...stat,
      expenses,
      netProfit: stat.dailyProfit - expenses
    };
  });
}

private async addExpensesToMonthlyStats(monthlyStats: any[], userId: string) {
  if (!monthlyStats || monthlyStats.length === 0) return [];
  
  // Get all monthly expenses
  const monthlyExpenses = await Expense.aggregate([
    {
      $match: {
        createdBy: new Types.ObjectId(userId),
        status: 'ACTIVE'
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
    }
  ]);
  
  // Combine with monthlyStats
  return monthlyStats.map(stat => {
    const matchingExpense = monthlyExpenses.find(exp => 
      exp._id.year === stat._id.year && 
      exp._id.month === stat._id.month
    );
    
    const expenses = matchingExpense ? matchingExpense.monthlyExpenses : 0;
    
    return {
      ...stat,
      expenses,
      netProfit: stat.monthlyTotal - expenses // Assuming profit was calculated already
    };
  });
}

private async addExpensesToYearlyStats(yearlyStats: any[], userId: string) {
  if (!yearlyStats || yearlyStats.length === 0) return [];
  
  // Get all yearly expenses
  const yearlyExpenses = await Expense.aggregate([
    {
      $match: {
        createdBy: new Types.ObjectId(userId),
        status: 'ACTIVE'
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' }
        },
        yearlyExpenses: { $sum: '$amount' }
      }
    }
  ]);
  
  // Combine with yearlyStats
  return yearlyStats.map(stat => {
    const matchingExpense = yearlyExpenses.find(exp => 
      exp._id.year === stat._id.year
    );
    
    const expenses = matchingExpense ? matchingExpense.yearlyExpenses : 0;
    
    return {
      ...stat,
      expenses,
      netProfit: stat.yearlyTotal - expenses // Assuming profit was calculated already
    };
  });
}

  
  // Fix for getRecentSales method to properly calculate profit
private async getRecentSales(matchStage: any) {
  return this.model.aggregate([
    matchStage,
    { $sort: { createdAt: -1 } },
    { $limit: 5 },
    {
      $project: {
        _id: 1,
        buyerName: 1,
        totalPrice: "$totalAmount",
        paymentMode: 1,
        createdAt: 1,
        // Calculate profit from products array
        profit: { 
          $reduce: {
            input: "$products",
            initialValue: 0,
            in: {
              $add: [
                "$$value",
                {
                  $multiply: [
                    "$$this.quantity",
                    { $subtract: ["$$this.SellingPrice", "$$this.productPrice"] }
                  ]
                }
              ]
            }
          }
        }
      }
    }
  ]);
}
  
  // Fix for transaction calculations
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
      
      // Calculate transaction summary with null checks
      const transactionSummary = {
        transactionId,
        totalItems: sales.length,
        totalQuantity: sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
        totalAmount: sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0), // Changed from totalPrice to totalAmount
        totalProfit: sales.reduce((sum, sale) => {
          if (sale.SellingPrice && sale.productPrice && sale.quantity) {
            return sum + (sale.quantity * (sale.SellingPrice - sale.productPrice));
          }
          return sum;
        }, 0),
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
// In the getDailyStats method
private async getDailyStats(matchStage: any) {
  return this.model.aggregate([
    matchStage,
    // First group by transaction to get accurate transaction counts
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
          paymentMode: "$paymentMode"
        },
        // Sum totalAmount without unwinding products (one sum per transaction)
        total: { $first: "$totalAmount" },  // Use first since totalAmount is same for the transaction
        count: { $sum: 1 }  // Count transactions
      }
    },
    // Then group by date and payment mode
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month", 
          day: "$_id.day",
          paymentMode: "$_id.paymentMode"
        },
        total: { $sum: "$total" },
        count: { $sum: "$count" }
      }
    },
    // Finally group just by date to get all payment modes
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month",
          day: "$_id.day" 
        },
        dailyTotal: { $sum: "$total" },
        transactionCount: { $sum: "$count" },
        payments: {
          $push: {
            mode: "$_id.paymentMode",
            total: "$total",
            count: "$count"
          }
        },
        cashTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cash"] },
              "$total",
              0
            ]
          }
        },
        momoTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "momo"] },
              "$total", 
              0
            ]
          }
        },
        chequeTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cheque"] },
              "$total",
              0
            ]
          }
        },
        transferTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "transfer"] },
              "$total",
              0
            ]
          }
        }
      }
    },
    // Now calculate profit in a separate stage after accurately counting transactions
    {
      $lookup: {
        from: "saletransactions", // The actual collection name in MongoDB
        let: { 
          year: "$_id.year", 
          month: "$_id.month", 
          day: "$_id.day" 
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: [{ $year: "$date" }, "$$year"] },
                  { $eq: [{ $month: "$date" }, "$$month"] },
                  { $eq: [{ $dayOfMonth: "$date" }, "$$day"] }
                ]
              }
            }
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: null,
              dailyProfit: {
                $sum: {
                  $multiply: [
                    "$products.quantity",
                    { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                  ]
                }
              }
            }
          }
        ],
        as: "profitData"
      }
    },
    {
      $addFields: {
        dailyProfit: {
          $cond: {
            if: { $gt: [{ $size: "$profitData" }, 0] },
            then: { $arrayElemAt: ["$profitData.dailyProfit", 0] },
            else: 0
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        dailyTotal: 1,
        dailyProfit: 1,
        transactionCount: 1,
        payments: 1,
        cashTotal: 1,
        momoTotal: 1,
        chequeTotal: 1, 
        transferTotal: 1
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
  ]);
}

private async getMonthlyStats(matchStage: any) {
  return this.model.aggregate([
    matchStage,
    // First group by transaction
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          month: { $month: "$date" },
          paymentMode: "$paymentMode"
        },
        total: { $first: "$totalAmount" },
        count: { $sum: 1 }
      }
    },
    // Then group by month and payment mode
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month",
          paymentMode: "$_id.paymentMode"
        },
        total: { $sum: "$total" },
        count: { $sum: "$count" }
      }
    },
    // Finally group just by month
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month"
        },
        monthlyTotal: { $sum: "$total" },
        transactionCount: { $sum: "$count" },
        payments: {
          $push: {
            mode: "$_id.paymentMode",
            total: "$total",
            count: "$count"
          }
        },
        cashTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cash"] },
              "$total",
              0
            ]
          }
        },
        momoTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "momo"] },
              "$total",
              0
            ]
          }
        },
        chequeTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cheque"] },
              "$total",
              0
            ]
          }
        },
        transferTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "transfer"] },
              "$total",
              0
            ]
          }
        }
      }
    },
    // Calculate profit separately
    {
      $lookup: {
        from: "saletransactions",
        let: { 
          year: "$_id.year", 
          month: "$_id.month"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: [{ $year: "$date" }, "$$year"] },
                  { $eq: [{ $month: "$date" }, "$$month"] }
                ]
              }
            }
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: null,
              monthlyProfit: {
                $sum: {
                  $multiply: [
                    "$products.quantity",
                    { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                  ]
                }
              }
            }
          }
        ],
        as: "profitData"
      }
    },
    {
      $addFields: {
        monthlyProfit: {
          $cond: {
            if: { $gt: [{ $size: "$profitData" }, 0] },
            then: { $arrayElemAt: ["$profitData.monthlyProfit", 0] },
            else: 0
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        monthlyTotal: 1,
        monthlyProfit: 1, 
        transactionCount: 1,
        payments: 1,
        cashTotal: 1,
        momoTotal: 1,
        chequeTotal: 1,
        transferTotal: 1
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } }
  ]);
}

private async getYearlyStats(matchStage: any) {
  return this.model.aggregate([
    matchStage,
    // First group by transaction
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          paymentMode: "$paymentMode"
        },
        total: { $first: "$totalAmount" },
        count: { $sum: 1 }
      }
    },
    // Then group by year and payment mode
    {
      $group: {
        _id: {
          year: "$_id.year",
          paymentMode: "$_id.paymentMode"
        },
        total: { $sum: "$total" },
        count: { $sum: "$count" }
      }
    },
    // Finally group just by year
    {
      $group: {
        _id: { 
          year: "$_id.year" 
        },
        yearlyTotal: { $sum: "$total" },
        transactionCount: { $sum: "$count" },
        payments: {
          $push: {
            mode: "$_id.paymentMode",
            total: "$total",
            count: "$count"
          }
        },
        cashTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cash"] },
              "$total",
              0
            ]
          }
        },
        momoTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "momo"] },
              "$total",
              0
            ]
          }
        },
        chequeTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "cheque"] },
              "$total",
              0
            ]
          }
        },
        transferTotal: { 
          $sum: { 
            $cond: [
              { $eq: ["$_id.paymentMode", "transfer"] },
              "$total",
              0
            ]
          }
        }
      }
    },
    // Calculate profit separately
    {
      $lookup: {
        from: "saletransactions",
        let: { year: "$_id.year" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: [{ $year: "$date" }, "$$year"]
              }
            }
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: null,
              yearlyProfit: {
                $sum: {
                  $multiply: [
                    "$products.quantity",
                    { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                  ]
                }
              }
            }
          }
        ],
        as: "profitData"
      }
    },
    {
      $addFields: {
        yearlyProfit: {
          $cond: {
            if: { $gt: [{ $size: "$profitData" }, 0] },
            then: { $arrayElemAt: ["$profitData.yearlyProfit", 0] },
            else: 0
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        yearlyTotal: 1,
        yearlyProfit: 1,
        transactionCount: 1,
        payments: 1,
        cashTotal: 1,
        momoTotal: 1,
        chequeTotal: 1,
        transferTotal: 1
      }
    },
    { $sort: { "_id.year": -1 } }
  ]);
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
    $unwind: "$products"
  },
  {
    $group: {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" }
      },
      totalQuantitySold: { $sum: "$products.quantity" },
      totalSaleAmount: { $sum: "$totalAmount" },
      totalSellingPrice: { 
        $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] } 
      },
      totalProductPrice: { 
        $sum: { $multiply: ["$products.quantity", "$products.productPrice"] } 
      },
      totalMarginProfit: {
        $sum: { 
          $multiply: [
            "$products.quantity", 
            { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
          ] 
        }
      },
      averageSaleAmount: { $avg: "$totalAmount" },
      totalCount: { $sum: 1 },
      cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
      momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
      chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
      transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
    }
  },
  { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
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
  
    // Update to match daily stats structure with products unwind
    const stats = await this.model.aggregate([
      matchStage,
      {
        $unwind: "$products"  // Unwind the products array
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          totalQuantitySold: { $sum: "$products.quantity" },
          totalSaleAmount: { $sum: "$totalAmount" },
          totalSellingPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] } 
          },
          totalProductPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.productPrice"] } 
          },
          totalMarginProfit: {
            $sum: { 
              $multiply: [
                "$products.quantity", 
                { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
              ] 
            }
          },
          averageSaleAmount: { $avg: "$totalAmount" },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
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
  
    // Updated to match daily stats structure with products unwind
    const stats = await this.model.aggregate([
      matchStage,
      {
        $unwind: "$products"  // Unwind the products array
      },
      {
        $group: {
          _id: { 
            year: { $year: "$createdAt" }
          },
          totalQuantitySold: { $sum: "$products.quantity" },
          totalSaleAmount: { $sum: "$totalAmount" },
          totalSellingPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.SellingPrice"] } 
          },
          totalProductPrice: { 
            $sum: { $multiply: ["$products.quantity", "$products.productPrice"] } 
          },
          totalMarginProfit: {
            $sum: { 
              $multiply: [
                "$products.quantity", 
                { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
              ] 
            }
          },
          averageSaleAmount: { $avg: "$totalAmount" },
          totalCount: { $sum: 1 },
          cashTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cash"] }, "$totalAmount", 0] } },
          momoTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "momo"] }, "$totalAmount", 0] } },
          chequeTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$totalAmount", 0] } },
          transferTotal: { $sum: { $cond: [{ $eq: ["$paymentMode", "transfer"] }, "$totalAmount", 0] } }
        }
      },
      { $sort: { "_id.year": -1 } }
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




  
  


const saleServices = new SaleServices();
export default saleServices;