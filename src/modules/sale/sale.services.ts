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
  
      // Create sale transaction - always start with "pending" status
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
        // Store the intended payment info for later processing by accountant
        intendedAsCreditSale: payload.status === 'credit',
        // Store the paidAmount directly in the sale transaction for future credit processing
        ...(payload.debitDetails && { 
          paidAmount: payload.debitDetails.paidAmount || 0,
          debitDetails: payload.debitDetails  // Store full debit details for later processing
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
    
    // If user is accountant, show them all pending sales to review
    if (userRole === 'ACCOUNTANT') {
      matchStage.$match.status = { $in: ['approved', 'credit', 'rejected', 'pending'] };
    } else {
      matchStage.$match.status = { $in: ['approved', 'credit', 'rejected'] };
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
      
      // For credit sales, fetch the related debit records to show updated payment status
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
      
      // Calculate margins and totals correctly
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
        
        // Add to total sale amount based on status
        const saleAmount = sale.status === 'credit' ? (sale.paidAmount || 0) : (sale.totalAmount || 0);
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
        
        // Calculate margin and cost price for each product in the sale
        if (Array.isArray(sale.products)) {
          let saleMargin = 0;
          let saleCost = 0;
          
          sale.products.forEach(product => {
            const quantity = product.quantity || 0;
            const sellingPrice = product.SellingPrice || 0;
            const productPrice = product.productPrice || 0;
            
            // Calculate margin per unit and total margin for this product
            const marginPerUnit = sellingPrice - productPrice;
            const productMargin = marginPerUnit * quantity;
            const productCost = productPrice * quantity;
            
            saleMargin += productMargin;
            saleCost += productCost;
          });
          
          // For credit sales, adjust the margin based on paid proportion
          if (sale.status === 'credit' && sale.totalAmount > 0) {
            const paidProportion = (sale.paidAmount || 0) / sale.totalAmount;
            saleMargin = saleMargin * paidProportion;
          }
          
          // Add to running totals
          totalMarginAmount += saleMargin;
          totalCostPrice += saleCost;
          
          // Add calculated values to sale object for display
          sale.marginAmount = saleMargin;
          sale.costPrice = saleCost;
        } else {
          // Fallback for any sales that might not have products array
          sale.marginAmount = 0;
          sale.costPrice = 0;
        }
      });
      
      // Get credit statistics
      const [creditStats] = await this.model.aggregate([
        {
          $match: {
            status: 'credit',
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
        // Add credit stats
        totalCreditAmount: creditStats?.totalCreditAmount || 0,
        totalCreditCount: creditStats?.totalCreditCount || 0,
        totalPaidCreditAmount: creditStats?.totalPaidAmount || 0,
        totalRemainingCredit: creditStats?.totalRemainingCredit || 0,
        totalCreditMargin: totalCreditMargin || 0
      };
    
      const totalCount2 = await this.model.countDocuments(matchStage.$match);
    
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
      // If startDate and endDate are provided, use them
      startDateTime = new Date(startDate);
      endDateTime = new Date(endDate);
      // Force end of the endDate to 23:59:59.999
      endDateTime.setUTCHours(23, 59, 59, 999);
    } else {
      // If no range, default to today only
      startDateTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0));
      endDateTime = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));
    }
  
    const matchStage = {
      $match: {
        user: new Types.ObjectId(userId),
        date: {
          $gte: startDateTime,
          $lte: endDateTime
        }
      }
    };
  
    try {
      // First, get all sales within the time range (approved or credit)
      const sales = await this.model.find({
        ...matchStage.$match,
        status: { $in: ['approved', 'credit'] }
      }).lean();
  
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
        const saleAmount = sale.status === 'credit' ? (sale.paidAmount || 0) : (sale.totalAmount || 0);
        dailyEntry.dailyTotal += saleAmount;
        
        // Calculate margin correctly
        if (Array.isArray(sale.products)) {
          let saleMargin = 0;
          
          sale.products.forEach(product => {
            const quantity = product.quantity || 0;
            const sellingPrice = product.SellingPrice || 0;
            const productPrice = product.productPrice || 0;
            
            const marginPerUnit = sellingPrice - productPrice;
            const productMargin = marginPerUnit * quantity;
            
            saleMargin += productMargin;
          });
          
          // For credit sales, adjust the margin based on paid proportion
          if (sale.status === 'credit' && sale.totalAmount > 0) {
            const paidProportion = (sale.paidAmount || 0) / sale.totalAmount;
            saleMargin = saleMargin * paidProportion;
          }
          
          dailyEntry.dailyProfit += saleMargin;
        }
      });
      
      // Convert map to array
      let dailyStats = Array.from(dailyStatsMap.values());
      
      // If no data but looking at today, create default entry
      if (dailyStats.length === 0) {
        dailyStats = [{
          _id: {
            year: today.getUTCFullYear(),
            month: today.getUTCMonth() + 1,
            day: today.getUTCDate()
          },
          dailyTotal: 0,
          dailyProfit: 0,
          ordersCount: 0
        }];
      }
  
      // 2. Add expenses into daily stats
      const dailyStatsWithExpenses = await this.addExpensesToDailyStats(dailyStats, userId);
  
      // 3. Get credit stats
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
  
      // 4. Get total quantity sold
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
  
      // 5. Combine all stats together
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
  
      // 6. Calculate overall totals
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
      // Get monthly stats with proper status filtering
      const monthlyStats = await this.getMonthlyStats({
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: { $in: ['approved', 'credit'] }
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
  
      // Get total quantity sold
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
  
  

  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected' | 'credit') {
    try {
      // Get the sale before update
      const oldSale = await this.model.findById(id);
      if (!oldSale) {
        throw new CustomError(404, 'Sale not found');
      }
      
      // Check if we're changing to credit status
      if (status === 'credit' && oldSale.status !== 'credit') {
        // If changing to credit status without a debit record, create one
        const existingDebit = await DebitModel.findOne({ saleId: id });
        
        if (!existingDebit) {
          // Use stored debit details if available
          const debitDetails = oldSale.debitDetails || {};
          
          // Create a debit record with proper information
          await DebitModel.create({
            productName: oldSale.products.map(p => p.productName).join(', '),
            totalAmount: oldSale.totalAmount,
            paidAmount: oldSale.paidAmount || 0,
            remainingAmount: oldSale.totalAmount - (oldSale.paidAmount || 0),
            dueDate: debitDetails.dueDate ? new Date(debitDetails.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            buyerName: oldSale.buyerName,
            buyerPhoneNumber: debitDetails.buyerPhoneNumber || 'Unknown',
            buyerEmail: debitDetails.buyerEmail || 'Unknown',
            saleId: id,
            status: 'PENDING',
            description: debitDetails.description || 'Credit sale approved by accountant'
          });
        }
      }
      
      // Rest of the function remains the same...
      // If we're changing from credit status, check if we need to update the debit record
      if (oldSale.status === 'credit' && status !== 'credit') {
        const existingDebit = await DebitModel.findOne({ saleId: id });
        
        if (existingDebit) {
          // If sale is being approved, mark debit as completed
          if (status === 'approved') {
            await DebitModel.findByIdAndUpdate(
              existingDebit._id, 
              { 
                $set: { 
                  status: 'COMPLETED',
                  paidAmount: existingDebit.totalAmount,
                  remainingAmount: 0
                } 
              }
            );
          } 
          // If sale is being rejected, delete the debit record
          else if (status === 'rejected') {
            await DebitModel.findByIdAndDelete(existingDebit._id);
          }
        }
      }
      
      // Update sale status
      const updatedSale = await this.model.findByIdAndUpdate(
        id,
        { $set: { status } },
        { new: true }
      );
      
      if (!updatedSale) {
        throw new CustomError(404, 'Sale not found');
      }
      
      return updatedSale;
    } catch (error: any) {
      throw new CustomError(400, error.message || 'Failed to update sale status');
    }
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
        // user: new Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    };
  
    try {
      // Get yearly stats with proper status filtering
      const yearlyStats = await this.getYearlyStats({
        ...matchStage,
        $match: {
          ...matchStage.$match,
          status: { $in: ['approved', 'credit'] }
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
  
      // Get total quantity sold
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