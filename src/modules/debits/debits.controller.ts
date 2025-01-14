// src/controllers/debit.controller.ts

import { Request, Response } from 'express';
import { DebitService } from './debits.service';
import { catchAsync } from '../utils/catchAsync';
// import { AppError } from '../utils/appError'; // Import AppError class

const debitService = new DebitService();

export class DebitController {
  createDebit = catchAsync(async (req: Request, res: Response) => {
    const debit = await debitService.createDebit(req.body);
    res.status(201).json({
      status: 'success',
      data: debit,
    });
  });

  getAllDebits = catchAsync(async (req: Request, res: Response) => {
    const result = await debitService.getAllDebits(req.query);
    res.status(200).json({
      status: 'success',
      ...result,
    });
  });

  getDebitById = catchAsync(async (req: Request, res: Response) => {
    const debit = await debitService.getDebitById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: debit,
    });
  });

  updateDebit = catchAsync(async (req: Request, res: Response) => {
    const debit = await debitService.updateDebit(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: debit,
    });
  });

  deleteDebit = catchAsync(async (req: Request, res: Response) => {
    await debitService.deleteDebit(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  getDebitSummary = catchAsync(async (req: Request, res: Response) => {
    const summary = await debitService.getDebitSummary();
    res.status(200).json({
      status: 'success',
      data: summary,
    });
  });
}