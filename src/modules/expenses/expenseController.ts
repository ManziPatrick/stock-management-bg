import { Request, Response, NextFunction } from 'express';
import { getAllExpenses, createExpense, deleteExpense } from './expenseService';
import { validateExpense } from './expenseValidator';
import { ApiError } from './error';
import { IExpense } from './expense.interface';
import { Expense } from './expenseModel'; // Assuming Expense is the mongoose model

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract page and limit from query parameters
    const { page = 1, limit = 10, search = '', status = 'ACTIVE' } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    if (isNaN(pageNumber) || pageNumber <= 0) {
      throw new ApiError(400, 'Invalid page number');
    }

    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new ApiError(400, 'Invalid limit value');
    }

    // Call the service layer function to get expenses with pagination
    const expenses = await getAllExpenses({
      page: pageNumber,
      limit: limitNumber,
      search,
      status,
    });

    // Calculate the total number of expenses (for pagination purposes)
    const totalExpenses = await getTotalExpenses({ search, status });

    const totalPages = Math.ceil(totalExpenses / limitNumber);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Expenses retrieved successfully',
      data: expenses,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalExpenses,
      },
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    next(new ApiError(500, 'Failed to fetch expenses'));
  }
};

// Service function to get total number of expenses
export const getTotalExpenses = async ({ search, status }: { search: string, status: string }): Promise<number> => {
  const query: any = { status };
  if (search) {
    query['name'] = { $regex: search, $options: 'i' }; // Example search filter for "name" field
  }
  const totalExpenses = await Expense.countDocuments(query);
  return totalExpenses;
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
      date: new Date(validation.data.date), // Ensure date is properly converted
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

    const expense = await deleteExpense(id);

    if (!expense) {
      throw new ApiError(404, 'Expense not found');
    }

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Expense deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    next(error);
  }
};
