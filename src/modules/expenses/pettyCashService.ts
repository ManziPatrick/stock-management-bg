import { PettyCash } from './pettyCashModel';
import { Expense } from './expenseModel';
import { Types } from 'mongoose';
import { ApiError } from './error';

/**
 * Initialize petty cash if it doesn't exist
 */
export const initializePettyCash = async (userId: Types.ObjectId) => {
  try {
    // Check if petty cash record exists
    const pettyCashExists = await PettyCash.findOne();
    
    if (!pettyCashExists) {
      // Create new petty cash record with initial balance of 0
      return await PettyCash.create({
        balance: 0,
        lastTopup: new Date(),
        transactions: [{
          date: new Date(),
          amount: 0,
          description: 'Initial setup',
          performedBy: userId
        }]
      });
    }
    
    return pettyCashExists;
  } catch (error) {
    console.error('Error initializing petty cash:', error);
    throw new Error('Failed to initialize petty cash');
  }
};

/**
 * Get the current petty cash status and recent transactions
 */
export const getPettyCashStatus = async () => {
  try {
    // Find or create petty cash record
    let pettyCash = await PettyCash.findOne().populate({
      path: 'transactions.performedBy',
      select: 'name email'
    });
    
    if (!pettyCash) {
      throw new ApiError(404, 'Petty cash record not found');
    }
    
    // Get petty cash expenses for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const pettyCashExpenses = await Expense.find({
      paymentMethod: 'PETTY_CASH',
      date: { $gte: startOfMonth }
    }).select('title amount date createdBy')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
    
    return {
      pettyCash,
      monthlyExpenses: pettyCashExpenses
    };
  } catch (error) {
    console.error('Error getting petty cash status:', error);
    throw error;
  }
};

/**
 * Top up the petty cash balance
 */
export const topUpPettyCash = async (amount: number, description: string, userId: Types.ObjectId) => {
  try {
    if (amount <= 0) {
      throw new ApiError(400, 'Top-up amount must be positive');
    }
    
    // Find or initialize petty cash
    let pettyCash = await PettyCash.findOne();
    if (!pettyCash) {
      pettyCash = await initializePettyCash(userId);
    }
    
    // Add to balance and record transaction
    pettyCash.balance += amount;
    pettyCash.lastTopup = new Date();
    pettyCash.transactions.push({
      date: new Date(),
      amount: amount,
      description: description || 'Petty cash top-up',
      performedBy: userId
    });
    
    await pettyCash.save();
    return pettyCash;
  } catch (error) {
    console.error('Error topping up petty cash:', error);
    throw error;
  }
};

/**
 * Check if there's enough petty cash for an expense
 */
export const checkPettyCashBalance = async (amount: number) => {
  try {
    const pettyCash = await PettyCash.findOne();
    if (!pettyCash) {
      return false;
    }
    
    return pettyCash.balance >= amount;
  } catch (error) {
    console.error('Error checking petty cash balance:', error);
    throw new Error('Failed to check petty cash balance');
  }
};

/**
 * Record a petty cash expense
 */
export const recordPettyCashExpense = async (expenseId: Types.ObjectId, amount: number, description: string, userId: Types.ObjectId) => {
  try {
    let pettyCash = await PettyCash.findOne();
    if (!pettyCash) {
      pettyCash = await initializePettyCash(userId);
    }
    
    // Check if sufficient balance
    if (pettyCash.balance < amount) {
      throw new ApiError(400, 'Insufficient petty cash balance');
    }
    
    // Deduct from balance and record transaction
    pettyCash.balance -= amount;
    pettyCash.transactions.push({
      date: new Date(),
      amount: -amount, // Negative amount for expenses
      description: description,
      expenseId: expenseId,
      performedBy: userId
    });
    
    await pettyCash.save();
    return pettyCash;
  } catch (error) {
    console.error('Error recording petty cash expense:', error);
    throw error;
  }
};