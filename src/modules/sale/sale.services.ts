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
    const totalRevenue = await this.calculateTotalStockRevenue();

    // Calculate sold products total
    const soldProductsTotal = await this.model.aggregate([
      {
        $match: {
          $or: [
            { productName: { $regex: search, $options: 'i' } },
            { buyerName: { $regex: search, $options: 'i' } },
          ],
        },
      },
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
        }
      }
    ]);

    const data = await this.model.aggregate([
      {
        $match: {
          $or: [
            { productName: { $regex: search, $options: 'i' } },
            { buyerName: { $regex: search, $options: 'i' } },
          ],
        },
      },
      ...sortAndPaginatePipeline(query),
    ]);

    const totalCount = await this.model.countDocuments({
      $or: [
        { productName: { $regex: search, $options: 'i' } },
        { buyerName: { $regex: search, $options: 'i' } },
      ],
    });

    const summary = soldProductsTotal[0] || {
      totalQuantitySold: 0,
      totalSaleAmount: 0,
      totalSellingPrice: 0,
      totalProductPrice: 0,
      totalMarginProfit: 0,
      profit: 0
    };

    return {
      data,
      totalCount,
      totalRevenue: totalRevenue[0],
      summary
    };
}

async readAllDaily(userId: string) {
  const totalRevenue = await this.calculateTotalStockRevenue();
  const totalPurchasedAmount = await this.getTotalPurchasedAmount();

  // Define today's date range
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const dailyData = await this.model.aggregate([
      {
          $match: {
              user: new Types.ObjectId(userId),
              date: {
                  $exists: true,
                  $ne: null,
              },
              $expr: {
                  $and: [
                      { $gte: ['$date', startOfDay] },
                      { $lte: ['$date', endOfDay] },
                  ],
              },
          },
      },
      {
          $facet: {
              sales: [
                  {
                      $group: {
                          _id: {
                              day: { $dayOfMonth: '$date' },
                              month: { $month: '$date' },
                              year: { $year: '$date' },
                          },
                          totalQuantity: { $sum: '$quantity' },
                          totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
                          totalProductPrice: { $sum: '$productPrice' },
                          totalPurchasedAmount: { $sum: '$totalPrice' },
                          stockValue: {
                              $sum: {
                                  $multiply: ['$productPrice', { $subtract: ['$quantity', 0] }], // Adjust quantity multiplier as needed
                              },
                          },
                      },
                  },
              ],
              expenses: [
                  {
                      $match: {
                          createdBy: new Types.ObjectId(userId),
                          status: 'ACTIVE',
                          date: {
                              $gte: startOfDay,
                              $lte: endOfDay,
                          },
                      },
                  },
                  {
                      $group: {
                          _id: null,
                          dailyExpenses: { $sum: '$amount' },
                      },
                  },
              ],
          },
      },
      {
          $project: {
              dailyData: {
                  $map: {
                      input: '$sales',
                      as: 'sale',
                      in: {
                          _id: '$$sale._id',
                          totalQuantity: '$$sale.totalQuantity',
                          totalSellingPrice: '$$sale.totalSellingPrice',
                          totalProductPrice: '$$sale.totalProductPrice',
                          totalPurchasedAmount: '$$sale.totalPurchasedAmount',
                          stockValue: '$$sale.stockValue',
                          dailyExpenses: {
                              $ifNull: [
                                  { $arrayElemAt: ['$expenses.dailyExpenses', 0] },
                                  0,
                              ],
                          },
                          grossProfit: {
                              $subtract: ['$$sale.totalSellingPrice', '$$sale.totalPurchasedAmount'],
                          },
                          dailyRevenue: '$$sale.totalSellingPrice', // Today's revenue
                      },
                  },
              },
              totalDailyExpenses: { $ifNull: [{ $arrayElemAt: ['$expenses.dailyExpenses', 0] }, 0] },
          },
      },
  ]);

  const result = dailyData[0];
  const todaySummary = result?.dailyData[0] || {
      totalSellingPrice: 0,
      totalPurchasedAmount: 0,
      totalQuantity: 0,
      grossProfit: 0,
  };
  const dailyExpenses = result?.totalDailyExpenses || 0;

  return {
      dailyData: result?.dailyData || [],
      summary: {
          totalRevenue: totalRevenue[0],
          totalStock: totalRevenue[0]?.totalOverallStock || 0,
          dailyRevenue: todaySummary.totalSellingPrice, // Today's revenue
          dailyPurchased: todaySummary.totalPurchasedAmount,
          dailyQuantitySold: todaySummary.totalQuantity,
          dailyExpenses: dailyExpenses,
          dailyGrossProfit: todaySummary.grossProfit,
          dailyNetProfit: todaySummary.grossProfit - dailyExpenses,
          totalPurchasedAmount,
          totalExpenses: await this.calculateExpenses(userId),
          netProfit: (result?.dailyData || []).reduce((sum: number, day: any) => sum + (day.grossProfit - dailyExpenses), 0),
      },
  };
}





async readAllMonthly(userId: string) {
  const totalRevenue = await this.calculateTotalStockRevenue();
  const totalPurchasedAmount = await this.getTotalPurchasedAmount();

  // Get current month's date range
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  const monthlyData = await this.model.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        date: { 
          $exists: true, 
          $ne: null,
          $gte: monthStart,
          $lte: monthEnd
        },
      },
    },
    {
      $lookup: {
        from: 'expenses',
        pipeline: [
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
              _id: null,
              monthlyExpenses: { $sum: '$amount' }
            }
          }
        ],
        as: 'expensesData'
      }
    },
    {
      $group: {
        _id: { month: { $month: '$date' }, year: { $year: '$date' } },
        totalQuantity: { $sum: '$quantity' },
        totalSellingPrice: { $sum: { $multiply: ['$SellingPrice', '$quantity'] } },
        totalProductPrice: { $sum: '$productPrice' },
        totalPurchasedAmount: { $sum: '$totalPrice' },
        monthlyExpenses: { $first: { $ifNull: [{ $arrayElemAt: ['$expensesData.monthlyExpenses', 0] }, 0] } },
        stockValue: { 
          $sum: { 
            $multiply: ['$productPrice', { $subtract: ['$quantity', 0] }] 
          } 
        },
      },
    },
    {
      $addFields: {
        grossProfit: { 
          $subtract: ['$totalSellingPrice', '$totalPurchasedAmount'] 
        },
        netProfit: {
          $subtract: [
            { $subtract: ['$totalSellingPrice', '$totalPurchasedAmount'] },
            '$monthlyExpenses'
          ]
        },
        monthlyRevenue: '$totalSellingPrice'
      },
    }
  ]);

  const thisMonthSummary = monthlyData[0] || {
    totalSellingPrice: 0,
    totalPurchasedAmount: 0,
    totalQuantity: 0,
    monthlyExpenses: 0,
    grossProfit: 0,
    netProfit: 0
  };

  return {
    monthlyData,
    summary: {
      totalRevenue: totalRevenue[0],
      totalStock: totalRevenue[0]?.totalOverallStock || 0,
      monthlyRevenue: thisMonthSummary.totalSellingPrice,
      monthlyPurchased: thisMonthSummary.totalPurchasedAmount,
      monthlyQuantitySold: thisMonthSummary.totalQuantity,
      monthlyExpenses: thisMonthSummary.monthlyExpenses,
      monthlyGrossProfit: thisMonthSummary.grossProfit,
      monthlyNetProfit: thisMonthSummary.netProfit,
      totalPurchasedAmount,
      totalExpenses: await this.calculateExpenses(userId),
      netProfit: monthlyData.reduce((sum, month) => sum + month.netProfit, 0)
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