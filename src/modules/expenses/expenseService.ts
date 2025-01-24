import { Expense, IExpense } from './expenseModel';

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
}: {
    page: number;
    limit: number;
    search: string;
    status: string;
}) => {
    const query: any = { status };

    if (search) {
        query['name'] = { $regex: search, $options: 'i' };
    }

    try {
        // Get current date components
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        // Fetch paginated expenses
        const expenses = await Expense.find(query)
            .skip((page - 1) * limit)
            .limit(limit)
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
        ]);

        // Get daily statistics
        const dailyStats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                        day: { $dayOfMonth: '$date' }
                    },
                    dailyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
        ]);

        // Get monthly statistics
        const monthlyStats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' }
                    },
                    monthlyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1, '_id.month': -1 } }
        ]);

        // Get yearly statistics
        const yearlyStats = await Expense.aggregate([
            { $match: query },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' }
                    },
                    yearlyTotal: { $sum: '$amount' },
                    count: { $count: {} }
                }
            },
            { $sort: { '_id.year': -1 } }
        ]);

        // Get recent purchases
        const recentPurchases = await Expense.find(query)
            .sort({ date: -1 })
            .limit(5)
            .select('_id sellerName amount date status')
            .lean();

        return {
            statusCode: 200,
            success: true,
            message: "Purchases retrieved successfully!",
            data: expenses,
            meta: {
                page,
                limit,
                total: totalExpenses,
                totalPage: Math.ceil(totalExpenses / limit),
                totalExpenses: {
                    stats,
                    dailyStats,
                    monthlyStats,
                    yearlyStats,
                    recentPurchases
                }
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

        return await Expense.create(data);
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
        const expense = await Expense.findByIdAndDelete(id);
        if (!expense) {
            throw new Error(`Expense with ID ${id} not found.`);
        }
        return expense;
    } catch (error) {
        console.error('Error deleting expense:', error);
        throw new Error('Failed to delete expense.');
    }
};
