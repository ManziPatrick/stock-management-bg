import { Request, Response, NextFunction } from 'express';
import { getAllExpenses, createExpense, deleteExpense } from './expenseService';
import { validateExpense } from './expenseValidator';
import { ApiError } from './error';
import { IExpense } from './expense.interface';
import { Expense } from './expenseModel';

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract query parameters
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status = 'ACTIVE',
      sortField = 'date',
      sortOrder = 'desc',
      category,
      paymentMethod
    } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    if (isNaN(pageNumber) || pageNumber <= 0) {
      throw new ApiError(400, 'Invalid page number');
    }

    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new ApiError(400, 'Invalid limit value');
    }

    // Check user role - if not ADMIN or ACCOUNTANT, only show their own expenses
    let createdBy = null;
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ACCOUNTANT') {
      createdBy = req.user?._id;
    }

    // Call the service layer function to get expenses with pagination
    const expensesData = await getAllExpenses({
      page: pageNumber,
      limit: limitNumber,
      search: search as string,
      status: status as string,
      createdBy,
      sortField: sortField as string,
      sortOrder: sortOrder as string,
      category: category as string,
      paymentMethod: paymentMethod as string
    });

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Expenses retrieved successfully',
      data: expensesData.data,
      meta: expensesData.meta,
      total: expensesData.meta.total,
      totalPages: expensesData.meta.totalPages,
      page: pageNumber,
      limit: limitNumber
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    next(error);
  }
};

export const addExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = validateExpense(req.body);
    if (!validation.success) {
      throw new ApiError(
        400,
        'Validation Error',
        validation.error.errors.map((err) => err.message)
      );
    }

    if (!req.user?._id) {
      throw new ApiError(401, 'Unauthorized: User not logged in');
    }

    // Create a properly typed expense object
    const expenseData: Partial<IExpense> = {
      ...validation.data,
      createdBy: req.user._id,
      date: validation.data.date ? new Date(validation.data.date) : new Date(), // Use current date if not provided
    };

    const expense = await createExpense(expenseData);

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: 'Expense created successfully',
      data: expense,
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    next(error);
  }
};

export const removeExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ApiError(400, 'Expense ID is required');
    }

    // First check if the user has permission to delete this expense
    const expense = await Expense.findById(id);
    if (!expense) {
      throw new ApiError(404, 'Expense not found');
    }

    // Only allow ADMIN or the creator to delete expenses
    if (req.user?.role !== 'ADMIN' && 
        req.user?._id.toString() !== expense.createdBy.toString()) {
      throw new ApiError(403, 'You do not have permission to delete this expense');
    }

    const deletedExpense = await deleteExpense(id);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Expense deleted successfully',
      data: deletedExpense,
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    next(error);
  }
};