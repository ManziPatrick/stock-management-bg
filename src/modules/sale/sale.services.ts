//@ts-nocheck
import mongoose, { Types } from 'mongoose';
import BaseServices from '../baseServices';
import SaleTransaction from './sale.model';
import Product from '../product/product.model';
import { eachDayOfInterval, format } from 'date-fns';
import CustomError from '../../errors/customError';
import { IProductSale } from './sale.interface';
import { DebitModel } from '../debits/debits.models';

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

async processProductWithInventory(product: any) {
  const productDoc = await Product.findById(product.product);

  if (!productDoc) {
    throw new CustomError(404, `Product not found: ${product.product}`);
  }

  // Ensure the stock is sufficient
  if (product.quantity > productDoc.stock || productDoc.stock < 0) {
    throw new CustomError(
      400,
      `Insufficient stock for ${productDoc.name}. Available: ${Math.max(0, productDoc.stock)}, Requested: ${product.quantity}`
    );
  }

  // Atomically update stock to avoid race conditions
  const updatedProduct = await Product.findOneAndUpdate(
    {
      _id: product.product,
      stock: { $gte: product.quantity }
    },
    {
      $inc: { stock: -product.quantity }
    },
    { new: true }
  );

  if (!updatedProduct) {
    throw new CustomError(
      400,
      `Stock update failed for ${productDoc.name}. It may have been sold simultaneously by another user.`
    );
  }

  return {
    product: product.product,
    productName: productDoc.name,
    productPrice: productDoc.price, // assuming this is the original cost
    SellingPrice: product.SellingPrice,
    quantity: product.quantity,
    inventoryReserved: true
  };
}



  // Enhanced create method
  async create(payload: CreateSalePayload, userId: string) {
  try {
    const transactionId = new mongoose.Types.ObjectId();
    const saleDate = new Date(payload.date);

    // Process all products and reserve inventory
    const processedProducts = await Promise.all(
      payload.products.map(product => this.processProductWithInventory(product))
    );

    // Calculate total amount
    const totalAmount = processedProducts.reduce(
      (sum, product) => sum + (product.quantity * product.SellingPrice),
      0
    );

    // Create sale transaction WITHOUT session or transaction
    const saleTransaction = await SaleTransaction.create({
      user: userId,
      buyerName: payload.buyerName,
      date: saleDate,
      paymentMode: payload.paymentMode,
      paymentDetails: payload.paymentDetails,
      products: processedProducts,
      transactionId,
      totalAmount,
      status: 'pending',
      inventoryStatus: 'reserved', // Inventory reserved but not deducted
      isProductsCollected: false,
      intendedAsCreditSale: payload.status === 'credit',
      ...(payload.debitDetails && { 
        paidAmount: payload.debitDetails.paidAmount || 0,
        debitDetails: payload.debitDetails
      })
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
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Daily Stats - matching your getDailyStats approach
  const dailyStats = await SaleTransaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        date: { 
          $gte: today,
          $lt: tomorrow 
        },
        status: { $in: ['approved', 'pending', undefined, null] } // Include legacy records
      }
    },
    // First group by transaction to avoid duplicates
    {
      $group: {
        _id: {
          transactionId: "$transactionId"
        },
        totalAmount: { $first: "$totalAmount" }, // Use first since it's same for the transaction
        count: { $sum: 1 }
      }
    },
    // Then aggregate the totals
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" },
        transactionCount: { $sum: "$count" }
      }
    }
  ]);

  // Monthly Stats - matching your getMonthlyStats approach
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  const monthlyStats = await SaleTransaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        date: { 
          $gte: startOfMonth,
          $lt: endOfMonth 
        },
        status: { $in: ['approved', 'credit'] } // Only approved and credit sales
      }
    },
    // First group by transaction
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          status: "$status"
        },
        total: { 
          $first: { 
            $cond: [
              { $eq: ["$status", "credit"] },
              { $ifNull: ["$paidAmount", 0] },
              "$totalAmount"
            ] 
          } 
        },
        count: { $sum: 1 }
      }
    },
    // Then aggregate the totals
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$total" },
        transactionCount: { $sum: "$count" }
      }
    }
  ]);

  return {
    daily: dailyStats[0] || { totalSales: 0, transactionCount: 0 },
    monthly: monthlyStats[0] || { totalSales: 0, transactionCount: 0 }
  };
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
    // Update the match stage to include only approved sales
    const updatedMatchStage = {
      ...matchStage,
      $match: {
        ...matchStage.$match,
        status: { $in: ['approved', 'credit'] } // Only count approved and credit sales
      }
    };
  
    return await this.model.aggregate([
      updatedMatchStage,
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
       
          totalAmount: { 
            $sum: { 
              $cond: [
                { $eq: ['$status', 'credit'] },
                { $ifNull: ['$paidAmount', 0] }, // Use paidAmount for credit sales
                '$totalAmount' 
              ] 
            } 
          }
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
  const userRole = query.userRole as string;

  let matchStage: any = {
    $match: {
      $or: [
        { productName: { $regex: search, $options: 'i' } },
      { buyerName: { $regex: search, $options: 'i' } },
      ],
    },
  };
  
  // FIXED: Simplified status filtering logic
    if (userRole === 'ACCOUNTANT') {
    // Accountants see all sales except rejected
    matchStage.$match.status = { $in: ['approved', 'credit', 'pending'] };
    } else {
    // Regular users see all their sales except rejected
    matchStage.$match.status = { $in: ['approved', 'credit', 'pending'] };
    // matchStage.$match.user = new Types.ObjectId(userId);
  }

  try {
    // Get paginated results
  const skip = (page - 1) * limit;
    const data = await this.model
      .find(matchStage.$match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // For credit sales, fetch the related debit records
    const saleIds = data.filter(sale => sale.status === 'credit').map(sale => sale._id.toString());
    let debitRecords = [];
    
    
    if (saleIds.length > 0) {
      debitRecords = await DebitModel.find({ saleId: { $in: saleIds } }).lean();
      
      // Enhance credit sales with their debit information
      data.forEach(sale => {
        if (sale.status === 'credit') {
          const relatedDebit = debitRecords.find(debit => debit.saleId === sale._id.toString());
          if (relatedDebit) {
            sale.paidAmount = relatedDebit.paidAmount;
            sale.remainingAmount = relatedDebit.remainingAmount;
            sale.debitStatus = relatedDebit.status;
            sale.dueDate = relatedDebit.dueDate;
          }
        }
      });
    }

    // Calculate margins and totals
    let totalSaleAmount = 0;
    let totalMarginAmount = 0;
    let totalCostPrice = 0;
    let totalCount = 0;
    let cashTotal = 0;
    let momoTotal = 0;
    let chequeTotal = 0;
    let transferTotal = 0;
    let creditPaidTotal = 0;
    
    // Process each sale to calculate margins correctly
    data.forEach(sale => {
      totalCount++;
      
      // FIXED: Calculate sale amount based on status - include pending sales
      let saleAmount = 0;
      if (sale.status === 'credit') {
        saleAmount = sale.paidAmount || 0;
      } else if (sale.status === 'approved') {
        saleAmount = sale.totalAmount || 0;
      } else if (sale.status === 'pending') {
        // FIXED: Include pending sales in display but show actual amount
        saleAmount = sale.totalAmount || 0; // Show the pending amount
      }
      
      totalSaleAmount += saleAmount;
      
      // Add to appropriate payment method total
      if (sale.paymentMode === 'cash') {
        cashTotal += saleAmount;
      } else if (sale.paymentMode === 'momo') {
        momoTotal += saleAmount;
      } else if (sale.paymentMode === 'cheque') {
        chequeTotal += saleAmount;
      } else if (sale.paymentMode === 'transfer') {
        transferTotal += saleAmount;
      }
      
      // Track paid amounts for credit sales separately
      if (sale.status === 'credit') {
        creditPaidTotal += (sale.paidAmount || 0);
      }
      
      // Calculate margin and cost price
      if (Array.isArray(sale.products)) {
        let saleMargin = 0;
        let saleCost = 0;
        
        sale.products.forEach(product => {
          const quantity = product.quantity || 0;
          const sellingPrice = product.SellingPrice || 0;
          const productPrice = product.productPrice || 0;
          
          const marginPerUnit = sellingPrice - productPrice;
          const productMargin = marginPerUnit * quantity;
          const productCost = productPrice * quantity;
          
          saleMargin += productMargin;
          saleCost += productCost;
        });
        
        totalMarginAmount += saleMargin;
        totalCostPrice += saleCost;
        
        // Add calculated values to sale object for display
        sale.marginAmount = saleMargin;
        sale.costPrice = saleCost;
      } else {
        sale.marginAmount = 0;
        sale.costPrice = 0;
      }
    });

    // Get credit statistics
    const [creditStats] = await this.model.aggregate([
      {
        $match: {
          status: 'credit',
          ...(userRole !== 'ACCOUNTANT' && { user: new Types.ObjectId(userId) }),
            $or: [
            { productName: { $regex: search, $options: 'i' } },
              { buyerName: { $regex: search, $options: 'i' } },
          ],
        }
      },
      {
        $group: {
          _id: null,
          totalCreditAmount: { $sum: "$totalAmount" },
          totalCreditCount: { $sum: 1 },
          totalPaidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalRemainingCredit: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } }
        }
      }
    ]) || { totalCreditAmount: 0, totalCreditCount: 0, totalPaidAmount: 0, totalRemainingCredit: 0 };

    // Calculate credit margin
    let totalCreditMargin = 0;
    const creditSales = data.filter(sale => sale.status === 'credit');
    creditSales.forEach(sale => {
      totalCreditMargin += (sale.marginAmount || 0);
    });

    // Get expenses for the entire period
    const totalExpenses = await this.calculateExpenses(userId);

    // Prepare simplified stats with focus on totals
    const simplifiedStats = {
      totalSaleAmount: totalSaleAmount || 0,
      totalMarginAmount: totalMarginAmount || 0,
      totalCostPrice: totalCostPrice || 0,
      netProfit: (totalMarginAmount || 0) - (totalExpenses || 0),
      totalCount: totalCount || 0,
      cashTotal: cashTotal || 0,
      momoTotal: momoTotal || 0,
      chequeTotal: chequeTotal || 0,
      transferTotal: transferTotal || 0,
      creditPaidTotal: creditPaidTotal || 0,
      expenses: totalExpenses || 0,
      totalCreditAmount: creditStats?.totalCreditAmount || 0,
      totalCreditCount: creditStats?.totalCreditCount || 0,
      totalPaidCreditAmount: creditStats?.totalPaidAmount || 0,
      totalRemainingCredit: creditStats?.totalRemainingCredit || 0,
      totalCreditMargin: totalCreditMargin || 0
    };

    const totalCount2 = await this.model.countDocuments(matchStage.$match);
console.log("simplifiedStats",simplifiedStats)
console.log("data",data)
    return {
      statusCode: 200,
      success: true,
      message: 'Sales retrieved successfully!',
      data,
      meta: {
        page,
        limit,
        total: totalCount2,
        totalPages: Math.ceil(totalCount2 / limit),
        totalSales: {
          stats: simplifiedStats
        },
      },
    };

  } catch (error) {
    console.error('Error fetching sales:', error);
    throw new Error('Failed to fetch sales.');
  }
}
private async addExpensesToDailyStats(dailyStats: any[], userId: string) {
  if (!dailyStats || dailyStats.length === 0) return [];
  
  const dates = dailyStats.map(stat => ({
    year: stat._id.year,
    month: stat._id.month,
    day: stat._id.day
  }));
  
 
  const dailyExpenses = await Expense.aggregate([
    {
      $match: {
        // createdBy: new Types.ObjectId(userId),
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
        // createdBy: new Types.ObjectId(userId),
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

  const statusMatchStage = {
    ...matchStage,
    $match: {
      ...matchStage.$match,
      status: { $in: ['approved','pending', undefined, null] } // Include legacy records without status
    }
  };
  return this.model.aggregate([
    matchStage,
    statusMatchStage,
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
     
        total: { $first: "$totalAmount" },  // Use first since totalAmount is same for the transaction
        count: { $sum: 1 }  // Count transactions
      }
    },
   
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
  const statusMatchStage = {
    ...matchStage,
    $match: {
      ...matchStage.$match,
      status: { $in: ['approved', 'credit'] } // Only include approved and credit sales
    }
  };
  
  return this.model.aggregate([
    statusMatchStage,
    // First group by transaction
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          month: { $month: "$date" },
          paymentMode: "$paymentMode",
          status: "$status" // Track status for credit sales
        },
        total: { 
          $first: { 
            $cond: [
              { $eq: ["$status", "credit"] },
              { $ifNull: ["$paidAmount", 0] },
              "$totalAmount"
            ] 
          } 
        },
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
    // Calculate profit separately with the same credit handling approach
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
                  { $eq: [{ $month: "$date" }, "$$month"] },
                  { $in: ["$status", ["approved", "credit"]] }
                ]
              }
            }
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: {
                status: "$status"
              },
              monthlyProfit: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "credit"] },
                    // For credit sales, calculate profit based on paidAmount proportion
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $ifNull: ["$paidAmount", 0] },
                            { $cond: [{ $eq: ["$totalAmount", 0] }, 1, "$totalAmount"] }
                          ]
                        },
                        {
                          $multiply: [
                            "$products.quantity",
                            { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                          ]
                        }
                      ]
                    },
                    // For approved sales, calculate regular profit
                    {
                      $multiply: [
                        "$products.quantity",
                        { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                      ]
                    }
                  ]
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              monthlyProfit: { $sum: "$monthlyProfit" }
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
  const statusMatchStage = {
    ...matchStage,
    $match: {
      ...matchStage.$match,
      status: { $in: ['approved', 'credit'] } // Only include approved and credit sales
    }
  };
  
  return this.model.aggregate([
    statusMatchStage,
    // First group by transaction
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          paymentMode: "$paymentMode",
          status: "$status"
        },
        total: { 
          $first: { 
            $cond: [
              { $eq: ["$status", "credit"] },
              { $ifNull: ["$paidAmount", 0] },
              "$totalAmount"
            ] 
          } 
        },
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
                $and: [
                  { $eq: [{ $year: "$date" }, "$$year"] },
                  { $in: ["$status", ["approved", "credit"]] }
                ]
              }
            }
          },
          { $unwind: "$products" },
          {
            $group: {
              _id: {
                status: "$status"
              },
              yearlyProfit: {
                $sum: {
                  $cond: [
                    { $eq: ["$status", "credit"] },
                    // For credit sales, calculate profit based on paidAmount proportion
                    {
                      $multiply: [
                        {
                          $divide: [
                            { $ifNull: ["$paidAmount", 0] },
                            { $cond: [{ $eq: ["$totalAmount", 0] }, 1, "$totalAmount"] }
                          ]
                        },
                        {
                          $multiply: [
                            "$products.quantity",
                            { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                          ]
                        }
                      ]
                    },
                    // For approved sales, calculate regular profit
                    {
                      $multiply: [
                        "$products.quantity",
                        { $subtract: ["$products.SellingPrice", "$products.productPrice"] }
                      ]
                    }
                  ]
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              yearlyProfit: { $sum: "$yearlyProfit" }
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

async getTotalCredit(userId: string) {
  try {
    // Get all credit sales
    const creditSales = await this.model.find({ 
      user: userId,
      status: 'credit'
    });
    
    // Get all debit records related to these sales
    const saleIds = creditSales.map(sale => sale._id.toString());
    const debitRecords = await DebitModel.find({
      saleId: { $in: saleIds }
    });
    
    // Calculate statistics
    const totalCreditAmount = creditSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPaidAmount = debitRecords.reduce((sum, debit) => sum + debit.paidAmount, 0);
    const totalRemainingAmount = debitRecords.reduce((sum, debit) => sum + debit.remainingAmount, 0);
    
    // Group credits by status
    const pendingCredits = debitRecords.filter(debit => debit.status === 'PENDING');
    const completedCredits = debitRecords.filter(debit => debit.status === 'COMPLETED');
    const overdueCredits = debitRecords.filter(debit => debit.status === 'OVERDUE');
    
    // Group by date (current month, previous months)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthCredits = debitRecords.filter(debit => {
      const debitDate = new Date(debit.createdAt);
      return debitDate.getMonth() === currentMonth && debitDate.getFullYear() === currentYear;
    });
    
    const previousMonthCredits = debitRecords.filter(debit => {
      const debitDate = new Date(debit.createdAt);
      const isPreviousMonth = (debitDate.getMonth() === currentMonth - 1 && debitDate.getFullYear() === currentYear) ||
                              (currentMonth === 0 && debitDate.getMonth() === 11 && debitDate.getFullYear() === currentYear - 1);
      return isPreviousMonth;
    });
    
    // Credits that are due within the next 7 days
    const nextWeekDueDate = new Date();
    nextWeekDueDate.setDate(nextWeekDueDate.getDate() + 7);
    
    const upcomingDueCredits = debitRecords.filter(debit => {
      const dueDate = new Date(debit.dueDate);
      return dueDate > now && dueDate <= nextWeekDueDate && debit.status === 'PENDING';
    });
    
    return {
      statusCode: 200,
      success: true,
      message: 'Credit statistics retrieved successfully',
      data: {
        totalCreditAmount,
        totalPaidAmount,
        totalRemainingAmount,
        totalCredits: debitRecords.length,
        pendingCredits: {
          count: pendingCredits.length,
          amount: pendingCredits.reduce((sum, debit) => sum + debit.remainingAmount, 0)
        },
        completedCredits: {
          count: completedCredits.length,
          amount: completedCredits.reduce((sum, debit) => sum + debit.totalAmount, 0)
        },
        overdueCredits: {
          count: overdueCredits.length,
          amount: overdueCredits.reduce((sum, debit) => sum + debit.remainingAmount, 0)
        },
        currentMonthCredits: {
          count: currentMonthCredits.length,
          amount: currentMonthCredits.reduce((sum, debit) => sum + debit.totalAmount, 0),
          paid: currentMonthCredits.reduce((sum, debit) => sum + debit.paidAmount, 0),
          remaining: currentMonthCredits.reduce((sum, debit) => sum + debit.remainingAmount, 0)
        },
        previousMonthCredits: {
          count: previousMonthCredits.length,
          amount: previousMonthCredits.reduce((sum, debit) => sum + debit.totalAmount, 0),
          paid: previousMonthCredits.reduce((sum, debit) => sum + debit.paidAmount, 0),
          remaining: previousMonthCredits.reduce((sum, debit) => sum + debit.remainingAmount, 0)
        },
        upcomingDueCredits: {
          count: upcomingDueCredits.length,
          amount: upcomingDueCredits.reduce((sum, debit) => sum + debit.remainingAmount, 0)
        }
      }
    };
  } catch (error: any) {
    throw new CustomError(400, error.message || 'Failed to get credit statistics');
  }
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
  const today = new Date();

  let startDateTime: Date;
  let endDateTime: Date;

  if (startDate && endDate) {
    startDateTime = new Date(startDate);
    endDateTime = new Date(endDate);
    endDateTime.setUTCHours(23, 59, 59, 999);
  } else {
    startDateTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
    endDateTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
  }

  const matchStage = {
    $match: {
      // user: new Types.ObjectId(userId),
      date: {
        $gte: startDateTime,
        $lte: endDateTime
      }
    }
  };

  try {
    // Get ALL sales within the time range regardless of status (but exclude rejected)
    // This ensures we don't lose sales after status changes
    const salesQuery = {
      user: new Types.ObjectId(userId),
      date: {
        $gte: startDateTime,
        $lte: endDateTime
      },
      status: { $in: ['pending', 'approved', 'credit'] } 
    };
    
    const sales = await this.model.find(salesQuery).lean();

    // For credit sales, fetch the related debit records
    const creditSaleIds = sales
      .filter(sale => sale.status === 'credit')
      .map(sale => sale._id.toString());
      
    let debitRecords = [];
    
    if (creditSaleIds.length > 0) {
      debitRecords = await DebitModel.find({ saleId: { $in: creditSaleIds } }).lean();
      
      // Enhance credit sales with their debit information
      sales.forEach(sale => {
        if (sale.status === 'credit') {
          const relatedDebit = debitRecords.find(debit => debit.saleId === sale._id.toString());
          if (relatedDebit) {
            sale.paidAmount = relatedDebit.paidAmount;
            sale.remainingAmount = relatedDebit.remainingAmount;
            sale.debitStatus = relatedDebit.status;
          }
        }
      });
    }

    // Process sales to calculate correct dailyStats
    const dailyStatsMap = new Map();
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      const dateKey = `${saleDate.getFullYear()}-${saleDate.getMonth() + 1}-${saleDate.getDate()}`;
      
      if (!dailyStatsMap.has(dateKey)) {
        dailyStatsMap.set(dateKey, {
          _id: {
            year: saleDate.getFullYear(),
            month: saleDate.getMonth() + 1,
            day: saleDate.getDate()
          },
          dailyTotal: 0,
          dailyProfit: 0,
          ordersCount: 0
        });
      }
      
      const dailyEntry = dailyStatsMap.get(dateKey);
      dailyEntry.ordersCount += 1;
      
      // Calculate amount to add based on status
      let saleAmount = 0;
      if (sale.status === 'credit') {
        saleAmount = sale.paidAmount || 0;
      } else if (sale.status === 'approved') {
        saleAmount = sale.totalAmount || 0;
      } else if (sale.status === 'pending') {
        // For pending sales, include them in count but with 0 amount until approved
        saleAmount = 0;
      }
      
      dailyEntry.dailyTotal += saleAmount;
      
      // Calculate margin correctly - only for approved and credit sales
      if ((sale.status === 'approved' || sale.status === 'credit') && Array.isArray(sale.products)) {
        let saleMargin = 0;
        
        sale.products.forEach(product => {
          const quantity = product.quantity || 0;
          const sellingPrice = product.SellingPrice || 0;
          const productPrice = product.productPrice || 0;
          
          const marginPerUnit = sellingPrice - productPrice;
          const productMargin = marginPerUnit * quantity;
          
          saleMargin += productMargin;
        });
        
        // For credit sales, use full margin (not proportional to paid amount)
        // This maintains consistency in profit calculations
        dailyEntry.dailyProfit += saleMargin;
      }
    });
    
    // Convert map to array
    let dailyStats = Array.from(dailyStatsMap.values());
    
    // Return empty result if no sales found
    if (dailyStats.length === 0) {
      return {
        statusCode: 200,
        success: true,
        message: 'No sales data found for the specified date range.',
        data: [],
        summary: {
          totalSales: 0,
          totalMargin: 0,
          totalExpenses: 0,
          totalCredit: 0,
          remainingCredit: 0,
          totalQuantity: 0,
          netProfit: 0
        }
      };
    }

    // Add expenses into daily stats
    const dailyStatsWithExpenses = await this.addExpensesToDailyStats(dailyStats, userId);

    // Get credit stats - include all credit sales regardless of approval status
    const creditStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: 'credit'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          totalCreditAmount: { $sum: "$totalAmount" },
          totalCreditCount: { $sum: 1 },
          totalPaidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalRemainingCredit: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    // Get total quantity sold - only from approved and credit sales
    const quantityStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: { $in: ['approved', 'credit'] }
        }
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          totalQuantity: { $sum: "$products.quantity" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
    ]);

    // Combine all stats together
    const finalStats = dailyStatsWithExpenses.map(stat => {
      const matchingCredit = creditStats.find(cs =>
        cs._id.year === stat._id.year &&
        cs._id.month === stat._id.month &&
        cs._id.day === stat._id.day
      );

      const matchingQuantity = quantityStats.find(qs =>
        qs._id.year === stat._id.year &&
        qs._id.month === stat._id.month &&
        qs._id.day === stat._id.day
      );

      return {
        ...stat,
        totalSales: stat.dailyTotal || 0,
        totalMargin: stat.dailyProfit || 0,
        totalExpenses: stat.expenses || 0,
        totalCredit: matchingCredit?.totalCreditAmount || 0,
        remainingCredit: matchingCredit?.totalRemainingCredit || 0,
        totalQuantity: matchingQuantity?.totalQuantity || 0,
        // Original credit stats
        totalCreditAmount: matchingCredit?.totalCreditAmount || 0,
        totalCreditCount: matchingCredit?.totalCreditCount || 0,
        totalPaidCreditAmount: matchingCredit?.totalPaidAmount || 0,
        totalRemainingCredit: matchingCredit?.totalRemainingCredit || 0,
        // Net profit (sales margin - expenses)
        netProfit: (stat.dailyProfit || 0) - (stat.expenses || 0)
      };
    });

    // Calculate overall totals
    const overallTotals = {
      totalSales: finalStats.reduce((sum, stat) => sum + (stat.totalSales || 0), 0),
      totalMargin: finalStats.reduce((sum, stat) => sum + (stat.totalMargin || 0), 0),
      totalExpenses: finalStats.reduce((sum, stat) => sum + (stat.totalExpenses || 0), 0),
      totalCredit: finalStats.reduce((sum, stat) => sum + (stat.totalCredit || 0), 0),
      remainingCredit: finalStats.reduce((sum, stat) => sum + (stat.remainingCredit || 0), 0),
      totalQuantity: finalStats.reduce((sum, stat) => sum + (stat.totalQuantity || 0), 0),
      netProfit: finalStats.reduce((sum, stat) => sum + (stat.netProfit || 0), 0)
    };

    return {
      statusCode: 200,
      success: true,
      message: 'Daily sales retrieved successfully!',
      data: finalStats,
      summary: overallTotals
    };
  } catch (error) {
    console.error('Error fetching daily sales:', error);
    throw new Error('Failed to fetch daily sales.');
  }
}
  
  
  

async readAllMonthly(query: { year?: string; userId: string }) {
  const { year, userId } = query;
  const currentYear = year || new Date().getFullYear().toString();
  const startDate = new Date(`${currentYear}-01-01`);
  const endDate = new Date(`${currentYear}-12-31T23:59:59.999Z`);

  const matchStage = {
    $match: {
      user: new Types.ObjectId(userId),
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }
  };

  try {
    // Get monthly stats - include all non-rejected sales
    const monthlyStats = await this.getMonthlyStats({
      ...matchStage,
      $match: {
        ...matchStage.$match,
        status: { $in: ['pending', 'approved', 'credit'] }
      }
    });
    
    const monthlyStatsWithExpenses = await this.addExpensesToMonthlyStats(monthlyStats, userId);

    // Get credit sales statistics
    const creditStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: 'credit'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalCreditAmount: { $sum: "$totalAmount" },
          totalCreditCount: { $sum: 1 },
          totalPaidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalRemainingCredit: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    // Get total quantity sold - only approved and credit
    const quantityStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: { $in: ['approved', 'credit'] }
        }
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" }
          },
          totalQuantity: { $sum: "$products.quantity" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } }
    ]);

    // Combine all stats
    const finalStats = monthlyStatsWithExpenses.map(stat => {
      const matchingCredit = creditStats.find(cs => 
        cs._id.year === stat._id.year && 
        cs._id.month === stat._id.month
      );

      const matchingQuantity = quantityStats.find(qs => 
        qs._id.year === stat._id.year && 
        qs._id.month === stat._id.month
      );

      return {
        ...stat,
        // Required metrics
        totalSales: stat.monthlyTotal || 0,
        totalMargin: stat.monthlyProfit || 0,
        totalExpenses: stat.expenses || 0,
        totalCredit: matchingCredit?.totalCreditAmount || 0,
        remainingCredit: matchingCredit?.totalRemainingCredit || 0,
        totalQuantity: matchingQuantity?.totalQuantity || 0,
        // Original credit stats  
        totalCreditAmount: matchingCredit?.totalCreditAmount || 0,
        totalCreditCount: matchingCredit?.totalCreditCount || 0,
        totalPaidCreditAmount: matchingCredit?.totalPaidAmount || 0,
        totalRemainingCredit: matchingCredit?.totalRemainingCredit || 0,
        // Net profit (sales margin minus expenses)
        netProfit: (stat.monthlyProfit || 0) - (stat.expenses || 0)
      };
    });

    // Calculate overall totals
    const overallTotals = {
      totalSales: finalStats.reduce((sum, stat) => sum + (stat.totalSales || 0), 0),
      totalMargin: finalStats.reduce((sum, stat) => sum + (stat.totalMargin || 0), 0),
      totalExpenses: finalStats.reduce((sum, stat) => sum + (stat.totalExpenses || 0), 0),
      totalCredit: finalStats.reduce((sum, stat) => sum + (stat.totalCredit || 0), 0),
      remainingCredit: finalStats.reduce((sum, stat) => sum + (stat.remainingCredit || 0), 0),
      totalQuantity: finalStats.reduce((sum, stat) => sum + (stat.totalQuantity || 0), 0),
      netProfit: finalStats.reduce((sum, stat) => sum + (stat.netProfit || 0), 0)
    };

    return {
      statusCode: 200,
      success: true,
      message: 'Monthly sales retrieved successfully!',
      data: finalStats,
      summary: overallTotals
    };
  } catch (error) {
    console.error('Error fetching monthly sales:', error);
    throw new Error('Failed to fetch monthly sales.');
  }
}


// FIXED: Updated getMonthlyStats helper method to handle all statuses properly
private async getMonthlyStats(matchStage: any) {
  return this.model.aggregate([
    matchStage,
    {
      $group: {
        _id: {
          transactionId: "$transactionId",
          year: { $year: "$date" },
          month: { $month: "$date" },
          paymentMode: "$paymentMode",
          status: "$status"
        },
        total: { 
          $first: { 
            $cond: [
              { $eq: ["$status", "credit"] },
              { $ifNull: ["$paidAmount", 0] },
              { 
                $cond: [
                  { $eq: ["$status", "approved"] },
                  "$totalAmount",
                  0 // Pending sales contribute 0 to revenue until approved
                ]
              }
            ] 
          } 
        },
        actualTotal: { $first: "$totalAmount" }, // Keep actual total for profit calculation
        count: { $sum: 1 }
      }
    },])
  }
  

async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'credit') {
  try {
    const oldSale = await this.model.findById(id);
    if (!oldSale) {
      throw new CustomError(404, 'Sale not found');
    }

    if (status === 'approved') {
      // FIXED: Update status and inventory status, but keep the sale record
      await this.model.findByIdAndUpdate(id, {
        status: 'approved',
        inventoryStatus: 'deducted' // Change from 'reserved' to 'deducted'
      });

      // Handle credit sale creation if intended as credit
      if (oldSale.intendedAsCreditSale) {
        const existingDebit = await DebitModel.findOne({ saleId: id });
        if (!existingDebit) {
          await DebitModel.create({
            productName: oldSale.products.map(p => p.productName).join(', '),
            totalAmount: oldSale.totalAmount,
            paidAmount: oldSale.paidAmount || 0,
            remainingAmount: oldSale.totalAmount - (oldSale.paidAmount || 0),
            dueDate: oldSale.debitDetails?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            buyerName: oldSale.buyerName,
            buyerPhoneNumber: oldSale.debitDetails?.buyerPhoneNumber || 'Unknown',
            buyerEmail: oldSale.debitDetails?.buyerEmail || 'Unknown',
            saleId: id,
            status: 'PENDING',
            description: oldSale.debitDetails?.description || 'Credit sale approved by accountant'
          });
        }
      }
    } else if (status === 'rejected') {
      // Restore inventory for rejected sales
      for (const product of oldSale.products) {
        await Product.findByIdAndUpdate(
          product.product,
          { $inc: { stock: product.quantity } } // Restore inventory
        );
      }

      // FIXED: Update status but keep the sale record for tracking
      await this.model.findByIdAndUpdate(id, {
        status: 'rejected',
        inventoryStatus: 'released' // Inventory released back to stock
      });

      // Remove any associated debit record
      await DebitModel.deleteOne({ saleId: id });
    } else if (status === 'credit') {
      // FIXED: Update status but keep the sale record
      await this.model.findByIdAndUpdate(id, { 
        status: 'credit',
        inventoryStatus: 'deducted' // Inventory is deducted for credit sales
      });

      // Create debit record for credit tracking
      const existingDebit = await DebitModel.findOne({ saleId: id });
      if (!existingDebit) {
        await DebitModel.create({
          productName: oldSale.products.map(p => p.productName).join(', '),
          totalAmount: oldSale.totalAmount,
          paidAmount: oldSale.paidAmount || 0,
          remainingAmount: oldSale.totalAmount - (oldSale.paidAmount || 0),
          dueDate: oldSale.debitDetails?.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          buyerName: oldSale.buyerName,
          buyerPhoneNumber: oldSale.debitDetails?.buyerPhoneNumber || 'Unknown',
          buyerEmail: oldSale.debitDetails?.buyerEmail || 'Unknown',
          saleId: id,
          status: 'PENDING',
          description: oldSale.debitDetails?.description || 'Credit sale'
        });
      }
    }

    // FIXED: Return the updated sale (it will always exist, just with different status)
    const updatedSale = await this.model.findById(id);
    return updatedSale;

  } catch (error: any) {
    throw new CustomError(400, error.message || 'Failed to update sale status');
  }
}

  // Method to mark products as collected
  async markProductsCollected(id: string, collected: boolean = true) {
    try {
      const updatedSale = await this.model.findByIdAndUpdate(
        id,
        { $set: { isProductsCollected: collected } },
        { new: true }
      );

      if (!updatedSale) {
        throw new CustomError(404, 'Sale not found');
      }

      return updatedSale;
    } catch (error: any) {
      throw new CustomError(400, error.message || 'Failed to update collection status');
    }
  }

  async getAllWithInventoryStatus(query: any) {
  const {
    page = 1,
    limit = 10,
    search = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filterBy = 'all', // Changed default to 'all'
    status,
    inventoryStatus,
    collectionStatus
  } = query;

  let matchStage: any = {};

  // Add search functionality
  if (search) {
    matchStage.$or = [
      { buyerName: { $regex: search, $options: 'i' } },
      { 'products.productName': { $regex: search, $options: 'i' } }
    ];
  }

  // Filter by status (optional - no default filtering)
  if (status) {
    matchStage.status = status;
  }

  // Filter by inventory status (optional)
  if (inventoryStatus) {
    matchStage.inventoryStatus = inventoryStatus;
  }

  // Filter by collection status (optional)  
  // if (collectionStatus !== undefined) {
  //   matchStage.isProductsCollected = collectionStatus === 'true';
  // }

  // Date filtering - only apply if specifically requested
  if (filterBy && filterBy !== 'all') {
    const now = new Date();
    switch (filterBy) {
      case 'daily':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        break;
      case 'monthly':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
        break;
      case 'yearly':
        matchStage.createdAt = {
          $gte: new Date(now.getFullYear(), 0, 1),
          $lt: new Date(now.getFullYear() + 1, 0, 1)
        };
        break;
      // 'all' or any other value will show all dates
    }
  }

  const skip = (page - 1) * limit;
  const sortStage: any = {};
  sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const pipeline = [
    { $match: matchStage },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: parseInt(limit) }
  ];

  const [sales, totalCount] = await Promise.all([
    this.model.aggregate(pipeline),
    this.model.countDocuments(matchStage)
  ]);

  return {
    data: sales,
    meta: {
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

  private async calculateStatistics(userId: string) {
    // Implementation for calculating statistics
    return {};
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
  
  const startDate = startYear ? new Date(`${startYear}-01-01`) : new Date(`${currentYear}-01-01`);
  const endDate = endYear 
    ? new Date(`${endYear}-12-31T23:59:59.999Z`) 
    : new Date(`${currentYear}-12-31T23:59:59.999Z`);

  const matchStage = {
    $match: {
      user: new Types.ObjectId(userId),
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }
  };

  try {
    // Get yearly stats - include all non-rejected sales
    const yearlyStats = await this.getYearlyStats({
      ...matchStage,
      $match: {
        ...matchStage.$match,
        status: { $in: ['pending', 'approved', 'credit'] }
      }
    });
    
    const yearlyStatsWithExpenses = await this.addExpensesToYearlyStats(yearlyStats, userId);

    // Get credit sales statistics
    const creditStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: 'credit'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" }
          },
          totalCreditAmount: { $sum: "$totalAmount" },
          totalCreditCount: { $sum: 1 },
          totalPaidAmount: { $sum: { $ifNull: ["$paidAmount", 0] } },
          totalRemainingCredit: { $sum: { $subtract: ["$totalAmount", { $ifNull: ["$paidAmount", 0] }] } }
        }
      },
      { $sort: { "_id.year": -1 } }
    ]);

    // Get total quantity sold - only approved and credit
    const quantityStats = await this.model.aggregate([
      {
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: { $in: ['approved', 'credit'] }
        }
      },
      { $unwind: "$products" },
      {
        $group: {
          _id: {
            year: { $year: "$date" }
          },
          totalQuantity: { $sum: "$products.quantity" }
        }
      },
      { $sort: { "_id.year": -1 } }
    ]);

    // Combine all stats
    const finalStats = yearlyStatsWithExpenses.map(stat => {
      const matchingCredit = creditStats.find(cs => cs._id.year === stat._id.year);
      const matchingQuantity = quantityStats.find(qs => qs._id.year === stat._id.year);

      return {
        ...stat,
        // Required metrics
        totalSales: stat.yearlyTotal || 0,
        totalMargin: stat.yearlyProfit || 0,
        totalExpenses: stat.expenses || 0,
        totalCredit: matchingCredit?.totalCreditAmount || 0,
        remainingCredit: matchingCredit?.totalRemainingCredit || 0,
        totalQuantity: matchingQuantity?.totalQuantity || 0,
        // Original credit stats
        totalCreditAmount: matchingCredit?.totalCreditAmount || 0,
        totalCreditCount: matchingCredit?.totalCreditCount || 0,
        totalPaidCreditAmount: matchingCredit?.totalPaidAmount || 0,
        totalRemainingCredit: matchingCredit?.totalRemainingCredit || 0,
        // Net profit (sales margin minus expenses)
        netProfit: (stat.yearlyProfit || 0) - (stat.expenses || 0)
      };
    });

    // Calculate overall totals
    const overallTotals = {
      totalSales: finalStats.reduce((sum, stat) => sum + (stat.totalSales || 0), 0),
      totalMargin: finalStats.reduce((sum, stat) => sum + (stat.totalMargin || 0), 0),
      totalExpenses: finalStats.reduce((sum, stat) => sum + (stat.totalExpenses || 0), 0),
      totalCredit: finalStats.reduce((sum, stat) => sum + (stat.totalCredit || 0), 0),
      remainingCredit: finalStats.reduce((sum, stat) => sum + (stat.remainingCredit || 0), 0),
      totalQuantity: finalStats.reduce((sum, stat) => sum + (stat.totalQuantity || 0), 0),
      netProfit: finalStats.reduce((sum, stat) => sum + (stat.netProfit || 0), 0)
    };

    return {
      statusCode: 200,
      success: true,
      message: 'Yearly sales retrieved successfully!',
      data: finalStats,
      summary: overallTotals
    };
  } catch (error) {
    console.error('Error fetching yearly sales:', error);
    throw new Error('Failed to fetch yearly sales.');
  }
}

  
   
}




  
  


const saleServices = new SaleServices();
export default saleServices;