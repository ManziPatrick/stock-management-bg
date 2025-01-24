import mongoose, { Types } from 'mongoose';
import sortAndPaginatePipeline from '../../lib/sortAndPaginate.pipeline';
import BaseServices from '../baseServices';
import Sale from './sale.model';
import Product from '../product/product.model';
import { Expense } from '../expenses/expenseModel';
import CustomError from '../../errors/customError';

class SaleServices extends BaseServices<any> {
  constructor(model: any, modelName: string) {
    super(model, modelName);
  }

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
      {
        $sort: { _id: 1 }
      },
      {
        $group: {
          _id: null,
          sizeWiseRevenue: { $push: '$$ROOT' },
          totalOverallRevenue: { $sum: '$totalRevenue' },
          totalOverallStock: { $sum: '$totalStock' },
          
        }
      }
    ]);
  }

  async create(payload: any, userId: string) {
    try {
      const { quantity, SellingPrice, product: productId } = payload;
      payload.user = userId;

      const product = await Product.findById(productId);
      if (!product) {
        throw new CustomError(404, 'Product not found');
      }

      payload.productPrice = product.price;
      payload.SellingPrice = SellingPrice || product.price;
      payload.totalPrice = payload.productPrice * quantity;

      if (quantity > product.stock) {
        throw new CustomError(400, `${quantity} products are not available in stock!`);
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        product._id,
        { $inc: { stock: -quantity } },
        { new: true }
      );

      if (!updatedProduct) {
        throw new CustomError(400, 'Failed to update product stock');
      }

      const result = await this.model.create(payload);

      // Calculate total revenue after sale
      const totalRevenue = await this.calculateTotalStockRevenue();
      
      return {
        sale: result,
        totalRevenue: totalRevenue[0]
      };
    } catch (error: any) {
      console.error('Sale creation error:', error);
      throw new CustomError(400, 'Sale creation failed');
    }
  }

  async calculateExpenses(userId: string) {
    const totalExpenses = await Expense.aggregate([
      {
        $match: { createdBy: new Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    return totalExpenses[0]?.total || 0;
  }
  async readAll(query: Record<string, unknown> = {}) {
    const search = query.search ? (query.search as string) : '';
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 10;

    const matchStage = {
        $match: {
            $or: [
                { productName: { $regex: search, $options: 'i' } },
                { buyerName: { $regex: search, $options: 'i' } },
            ],
        },
    };

    try {
        // Calculate overall statistics
        const [stats] = await this.model.aggregate([
            matchStage,
            {
                $group: {
                    _id: null,
                    totalQuantitySold: { $sum: '$quantity' },
                    totalSaleAmount: { $sum: '$totalPrice' },
                    totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                    totalProductPrice: { $sum: '$productPrice' },
                    profit: { 
                        $sum: { 
                            $subtract: ['$SellingPrice', '$productPrice'] 
                        } 
                    },
                    totalMarginProfit: {
                        $sum: {
                            $multiply: [
                                '$quantity',
                                { $subtract: ['$SellingPrice', '$productPrice'] }
                            ]
                        }
                    },
                    averageSaleAmount: { $avg: '$totalPrice' },
                    totalCount: { $sum: 1 }
                }
            }
        ]);

        // Get daily statistics
        const dailyStats = await this.model.aggregate([
            matchStage,
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' },
                        day: { $dayOfMonth: '$createdAt' }
                    },
                    dailyTotal: { $sum: '$totalPrice' },
                    dailyTotalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                    quantity: { $sum: '$quantity' },
                    profit: {
                        $sum: {
                            $multiply: [
                                '$quantity',
                                { $subtract: ['$SellingPrice', '$productPrice'] }
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
        ]);

        // Get monthly statistics
        const monthlyStats = await this.model.aggregate([
            matchStage,
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    monthlyTotal: { $sum: '$totalPrice' },
                    monthlyTotalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                    quantity: { $sum: '$quantity' },
                    profit: {
                        $sum: {
                            $multiply: [
                                '$quantity',
                                { $subtract: ['$SellingPrice', '$productPrice'] }
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        // Get yearly statistics
        const yearlyStats = await this.model.aggregate([
            matchStage,
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' }
                    },
                    yearlyTotal: { $sum: '$totalPrice' },
                    yearlyTotalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                    quantity: { $sum: '$quantity' },
                    profit: {
                        $sum: {
                            $multiply: [
                                '$quantity',
                                { $subtract: ['$SellingPrice', '$productPrice'] }
                            ]
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': -1 } }
        ]);

        // Get recent sales
        const recentSales = await this.model.aggregate([
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
                    createdAt: 1,
                    profit: { 
                        $multiply: [
                            '$quantity',
                            { $subtract: ['$SellingPrice', '$productPrice'] }
                        ]
                    }
                }
            }
        ]);

        // Get paginated data
        const data = await this.model.aggregate([
            matchStage,
            ...sortAndPaginatePipeline(query),
        ]);

        const totalCount = await this.model.countDocuments(matchStage.$match);
        const totalRevenue = await this.calculateTotalStockRevenue();

        return {
            statusCode: 200,
            success: true,
            message: "Sales retrieved successfully!",
            data,
            meta: {
                page,
                limit,
                total: totalCount,
                totalPage: Math.ceil(totalCount / limit),
                totalSales: {
                    stats: stats || {
                        totalQuantitySold: 0,
                        totalSaleAmount: 0,
                        totalSellingPrice: 0,
                        totalProductPrice: 0,
                        totalMarginProfit: 0,
                        profit: 0,
                        averageSaleAmount: 0,
                        totalCount: 0
                    },
                    dailyStats,
                    monthlyStats,
                    yearlyStats,
                    recentSales,
                    totalRevenue: totalRevenue[0]
                }
            }
        };
    } catch (error) {
        console.error('Error fetching sales:', error);
        throw new Error('Failed to fetch sales.');
    }
}


async readAllDaily(userId: string) {
  try {
    const totalRevenue = await this.calculateTotalStockRevenue();
    const totalPurchasedAmount = await this.getTotalPurchasedAmount();

    // Define today's date range in UTC
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0));
    const endOfDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999));

    // Get daily records
    const dailyRecords = await this.model.find({
      user: new Types.ObjectId(userId),
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).lean();

    // Calculate daily totals
    const dailyTotals = dailyRecords.reduce((acc, record) => {
      return {
        totalQuantity: acc.totalQuantity + (record.quantity || 0),
        totalRevenue: acc.totalRevenue + (record.unitPrice * record.quantity || 0),
        totalPurchased: acc.totalPurchased + (record.totalPrice || 0)
      };
    }, { totalQuantity: 0, totalRevenue: 0, totalPurchased: 0 });

    // Get daily expenses
    const dailyExpenses = await Expense.aggregate([
      {
        $match: {
          createdBy: new Types.ObjectId(userId),
          status: 'ACTIVE',
          createdAt: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const todayExpenses = dailyExpenses[0]?.totalAmount || 0;

    // Format the response
    const response = {
      success: true,
      data: {
        dailyData: dailyRecords.map(record => ({
          ...record,
          id: record._id,
          date: record.createdAt,
          revenue: record.unitPrice * record.quantity,
          purchased: record.totalPrice
        })),
        summary: {
          totalRevenue: totalRevenue[0],
          totalStock: totalRevenue[0]?.totalOverallStock || 0,
          dailyRevenue: dailyTotals.totalRevenue,
          dailyPurchased: dailyTotals.totalPurchased, // This is the total purchased amount for the day
          dailyQuantitySold: dailyTotals.totalQuantity,
          dailyExpenses: todayExpenses,
          dailyGrossProfit: dailyTotals.totalRevenue - dailyTotals.totalPurchased,
          dailyNetProfit: (dailyTotals.totalRevenue - dailyTotals.totalPurchased) - todayExpenses,
          totalPurchasedAmount: totalPurchasedAmount,
          totalExpenses: await this.calculateExpenses(userId),
          transactions: dailyRecords
        }
      }
    };

    return response;

  } catch (error) {
    console.error('Error in readAllDaily:', error);
    throw new CustomError(500, 'Error fetching daily data');
  }
}

async readAllMonthly(userId: string) {
  const totalRevenue = await this.calculateTotalStockRevenue();
  const totalPurchasedAmount = await this.getTotalPurchasedAmount();

  // Get current month's date range
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  // Get monthly expenses
  const monthlyExpenses = await Expense.aggregate([
    {
      $match: {
        createdBy: new Types.ObjectId(userId),
        status: 'ACTIVE',
        date: {
          $gte: monthStart,
          $lte: monthEnd
        }
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Modified monthly sales aggregation
  const monthlyData = await this.model.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        date: {
          $gte: monthStart,
          $lte: monthEnd
        }
      }
    },
    {
      $group: {
        _id: { 
          month: { $month: '$date' }, 
          year: { $year: '$date' } 
        },
        totalQuantity: { $sum: '$quantity' },
        totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
        totalProductPrice: { $sum: { $multiply: ['$productPrice', '$quantity'] } },
        monthlyPurchasedAmount: { $sum: { $multiply: ['$productPrice', '$quantity'] } }
      }
    }
  ]);

  const thisMonthExpenses = monthlyExpenses[0]?.totalAmount || 0;
  const thisMonthSummary = monthlyData[0] || {
    totalSellingPrice: 0,
    monthlyPurchasedAmount: 0,
    totalQuantity: 0
  };

  return {
    monthlyData,
    summary: {
      totalRevenue: totalRevenue[0],
      totalStock: totalRevenue[0]?.totalOverallStock || 0,
      monthlyRevenue: thisMonthSummary.totalSellingPrice,
      monthlyPurchased: thisMonthSummary.monthlyPurchasedAmount,
      monthlyQuantitySold: thisMonthSummary.totalQuantity,
      monthlyExpenses: thisMonthExpenses, 
      monthlyGrossProfit: thisMonthSummary.totalSellingPrice - thisMonthSummary.monthlyPurchasedAmount,
      monthlyNetProfit: (thisMonthSummary.totalSellingPrice - thisMonthSummary.monthlyPurchasedAmount) - thisMonthExpenses,
      totalPurchasedAmount,
      totalExpenses: await this.calculateExpenses(userId),
      netProfit: monthlyData.reduce((sum, month) => {
        const monthGrossProfit = month.totalSellingPrice - month.monthlyPurchasedAmount;
        return sum + (monthGrossProfit - thisMonthExpenses);
      }, 0)
    }
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

  // async readAllMonthly(userId: string) {
  //   const totalExpenses = await this.calculateExpenses(userId);
  //   const totalRevenue = await this.calculateTotalStockRevenue();

  //   const monthlyData = await this.model.aggregate([
  //     {
  //       $match: {
  //         user: new Types.ObjectId(userId),
  //         date: { $exists: true, $ne: null },
  //       },
  //     },
  //     {
  //       $group: {
  //         _id: { month: { $month: '$date' }, year: { $year: '$date' } },
  //         totalQuantity: { $sum: '$quantity' },
  //         totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
  //         totalProductPrice: { $sum: '$productPrice' },
  //         totalExpenses: { $first: totalExpenses },
  //       },
  //     },
  //     {
  //       $addFields: {
  //         totalProfit: {
  //           $subtract: ['$totalSellingPrice', { $add: ['$totalProductPrice', '$totalExpenses'] }],
  //         }
  //       },
  //     },
  //     {
  //       $sort: { '_id.year': 1, '_id.month': 1 },
  //     },
  //   ]);

  //   return {
  //     monthlyData,
  //     totalRevenue: totalRevenue[0]
  //   };
  // }

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

  // Updated readAllYearly method
  async readAllYearly(userId: string) {
    const totalExpenses = await this.calculateExpenses(userId);
    const totalRevenue = await this.calculateTotalStockRevenue();
    const totalPurchasedAmount = await this.getTotalPurchasedAmount(); // Fetch total purchased amount
  
    const yearlyData = await this.model.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          date: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { year: { $year: '$date' } },
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
          },
          totalPurchasedAmount: totalPurchasedAmount, // Include total purchased amount
        },
      },
      {
        $sort: { '_id.year': 1 },
      },
    ]);
  
    return {
      yearlyData,
      totalRevenue: totalRevenue[0],
    };
  }
  
  
}

const saleServices = new SaleServices(Sale, 'Sale');
export default saleServices;