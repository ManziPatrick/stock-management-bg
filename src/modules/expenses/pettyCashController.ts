import { Request, Response, NextFunction } from 'express';
import { ApiError } from './error';
import { z } from 'zod';
import { 
  getPettyCashStatus, 
  topUpPettyCash, 
  initializePettyCash 
} from './pettyCashService';

// Validation schema for top-up requests
const topUpSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
});

export const getPettyCash = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, 'Unauthorized: User not logged in');
    }

    const pettyCashData = await getPettyCashStatus();

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Petty cash data retrieved successfully',
      data: pettyCashData
    });
  } catch (error) {
    console.error('Error fetching petty cash data:', error);
    next(error);
  }
};

export const initializePettyCashHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, 'Unauthorized: User not logged in');
    }

    const pettyCash = await initializePettyCash(req.user._id);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Petty cash initialized successfully',
      data: pettyCash
    });
  } catch (error) {
    console.error('Error initializing petty cash:', error);
    next(error);
  }
};

export const topUpPettyCashHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?._id) {
      throw new ApiError(401, 'Unauthorized: User not logged in');
    }

    const validation = topUpSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ApiError(
        400,
        'Validation Error',
        validation.error.errors.map((err) => err.message)
      );
    }

    const { amount, description = 'Petty cash top-up' } = validation.data;
    
    const pettyCash = await topUpPettyCash(amount, description, req.user._id);

    res.status(200).json({
      success: true,
      statusCode: 200,
      message: 'Petty cash topped up successfully',
      data: pettyCash
    });
  } catch (error) {
    console.error('Error topping up petty cash:', error);
    next(error);
  }
};