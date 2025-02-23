import { Request, Response } from 'express';
import { CreditService } from './credit.service';
import { catchAsync } from '../utils/catchAsync';

export class CreditController {
  private creditService: CreditService;

  constructor() {
    this.creditService = new CreditService();
  }

  createCredit = catchAsync(async (req: Request, res: Response) => {
    const credit = await this.creditService.createCredit(req.body);
    res.status(201).json({
      status: 'success',
      data: credit,
    });
  });

  getAllCredits = catchAsync(async (req: Request, res: Response) => {
    const result = await this.creditService.getAllCredits(req.query);
    res.status(200).json({
      status: 'success',
      ...result,
    });
  });

  getCreditById = catchAsync(async (req: Request, res: Response) => {
    const credit = await this.creditService.getCreditById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: credit,
    });
  });

  updateCredit = catchAsync(async (req: Request, res: Response) => {
    const credit = await this.creditService.updateCredit(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: credit,
    });
  });

  deleteCredit = catchAsync(async (req: Request, res: Response) => {
    await this.creditService.deleteCredit(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

  getCreditSummary = catchAsync(async (req: Request, res: Response) => {
    const summary = await this.creditService.getCreditSummary();
    res.status(200).json({
      status: 'success',
      data: summary,
    });
  });

  makePayment = catchAsync(async (req: Request, res: Response) => {
    const credit = await this.creditService.makePayment(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: credit,
    });
  });
}
