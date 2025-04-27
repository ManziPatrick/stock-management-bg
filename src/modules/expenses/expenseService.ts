import { Expense, IExpense } from './expenseModel';
import { checkPettyCashBalance, recordPettyCashExpense } from './pettyCashService';
import { ApiError } from './error';
import { Types } from 'mongoose';

/**
 * Fetch all expenses based on a query.
 * @param query - The query object for filtering expenses.
 * @returns A promise that resolves to an array of expenses.
 */
export const getAllExpenses = async ({
    page = 1,
    limit = 10,
    search = '',
    status = 'ACTIVE',
    sortField = 'date',
    sortOrder = 'desc',
    category = null,
    paymentMethod = null,
    createdBy = null
}: {
    page: number;
    limit: number;
    search: string;
    status: string;
    sortField?: string;
    sortOrder?: string;
    category?: string | null;
    paymentMethod?: string | null;
    createdBy?: Types.ObjectId | null;
}) => {
    const query: any = { status };

    // If createdBy is provided, filter by creator
    if (createdBy) {
        query.createdBy = createdBy;
    }

    // Apply category filter if provided
    if (category) {
        query.category = category;
    }

    // Apply payment method filter if provided
    if (paymentMethod) {
        query.paymentMethod = paymentMethod;
    }

    if (search) {
        query['title'] = { $regex: search, $options: 'i' };
    }

    // Create sort object
    const sort: any = {};
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    try {
        // Get current date components
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        // Fetch paginated expenses with user details
        const expenses = await Expense.find(query)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('createdBy', 'name email role')
            .exec();

        const totalExpenses = await Expense.countDocuments(query);

        // Get overall statistics
        const [stats] = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalExpenses: { $sum: '$amount' },
                    totalCount: { $count: {} },
                    averageAmount: { $avg: '$amount' },
                    minAmount: { $min: '$amount' },
                    maxAmount: { $max: '$amount' }
                }
            }
        ]) || [{ totalExpenses: 0, totalCount: 0, averageAmount: 0, minAmount: 0, maxAmount: 0 }];

        // Get payment method breakdown
        const paymentMethodStats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$paymentMethod',
                    total: { $sum: '$amount' },
                    count: { $count: {} }
                }
            }
        ]);

        // Get category breakdown
        const categoryStats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$category',
                    total: { $sum: '$amount' },
                    count: { $count: {} }
                }
            }
        ]);

        return {
            statusCode: 200,
            success: true,
            message: "Expenses retrieved successfully!",
            data: expenses,
            meta: {
                page,
                limit,
                total: totalExpenses,
                totalPages: Math.ceil(totalExpenses / limit),
                stats,
                paymentMethodStats,
                categoryStats
            }
        };
    } catch (error) {
        console.error('Error fetching expenses:', error);
        throw new Error('Failed to fetch expenses.');
    }
};

/**
 * Create a new expense document.
 * @param data - The data for the new expense.
 * @returns A promise that resolves to the created expense document.
 */
export const createExpense = async (data: Partial<IExpense>): Promise<IExpense> => {
    try {
        if (typeof data.date === 'string') {
            data.date = new Date(data.date);
            if (isNaN(data.date.getTime())) {
                throw new Error('Invalid date format.');
            }
        }

        if (!data.createdBy) {
            throw new Error('Missing createdBy field.');
        }

        // Check if petty cash has sufficient balance for the expense
        if (data.paymentMethod === 'PETTY_CASH') {
            const hasSufficientBalance = await checkPettyCashBalance(data.amount as number);
            if (!hasSufficientBalance) {
                throw new ApiError(400, 'Insufficient petty cash balance');
            }
        }

        // Create the expense
        const expense = await Expense.create(data);

        // If it's a petty cash expense, update the petty cash balance
        if (data.paymentMethod === 'PETTY_CASH') {
            await recordPettyCashExpense(
                expense._id,
                expense.amount,
                expense.title,
                expense.createdBy
            );
        }

        return await Expense.findById(expense._id).populate('createdBy', 'name email role');
    } catch (error) {
        if (error instanceof Error) {
            throw error; // Rethrow validation errors
        }
        throw new Error('Failed to create expense.');
    }
};

/**
 * Delete an expense by its ID.
 * @param id - The ID of the expense to delete.
 * @returns A promise that resolves to the deleted expense document or null if not found.
 */
export const deleteExpense = async (id: string): Promise<IExpense | null> => {
    try {
        const expense = await Expense.findByIdAndDelete(id).populate('createdBy', 'name email role');
        if (!expense) {
            throw new ApiError(404, `Expense with ID ${id} not found.`);
        }
        return expense;
    } catch (error) {
        console.error('Error deleting expense:', error);
        if (error instanceof ApiError) {
            throw error;
        }
        throw new Error('Failed to delete expense.');
    }
};