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

    // Add search filter if search term is provided
    if (search) {
        query['name'] = { $regex: search, $options: 'i' }; // Example search filter for "name" field
    }

    try {
        // Fetch expenses with pagination and filtering
        const expenses = await Expense.find(query)
            .skip((page - 1) * limit) // Skip items based on the page number and limit
            .limit(limit) // Limit the number of items per page
            .exec();

        // Fetch the total count of expenses matching the query for pagination
        const totalExpenses = await Expense.countDocuments(query);

        return {
            expenses,
            totalExpenses,
            totalPages: Math.ceil(totalExpenses / limit),
            currentPage: page,
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
