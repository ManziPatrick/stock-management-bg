
// sale.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import saleServices from './sale.services';

class SaleController {
  create = asyncHandler(async (req: Request, res: Response) => {
    const result = await saleServices.create(req.body, req.user._id);
    return sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'Sale created successfully',
      data: result
    });
  });

  readAll = asyncHandler(async (req: Request, res: Response) => {
    const query = {
      search: req.query.search as string || '',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as string || 'desc').toLowerCase()
    };

    const result = await saleServices.readAll(query);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sales retrieved successfully',
      data: result.data,
      meta: {
        ...result.meta,
        totalPage: result.meta.totalPages
      }
    });
  });

  readSingle = asyncHandler(async (req: Request, res: Response) => {
    const result = await saleServices.readById(req.params.id);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sale retrieved successfully',
      data: result
    });
  });


  update = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const result = await saleServices.update(id, req.body);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sale updated successfully',
      data: result
    });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await saleServices.delete(id);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Sale deleted successfully'
    });
  });

  readAllDaily = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const { startDate, endDate } = req.query;
    const result = await saleServices.readAllDaily({
      startDate: startDate as string,
      endDate: endDate as string,
      userId: user._id
    });
    
    return sendResponse(res, result);
  });

  readAllWeekly = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const result = await saleServices.readAllWeekly(user._id);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Weekly sales retrieved successfully',
      data: result
    });
  });

  readAllMonthly = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const { year } = req.query;
    const result = await saleServices.readAllMonthly({
      year: year as string,
      userId: user._id
    });
    
    return sendResponse(res, result);
  });

  readAllYearly = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const { startYear, endYear } = req.query;
    const result = await saleServices.readAllYearly({
      startYear: startYear as string,
      endYear: endYear as string,
      userId: user._id
    });
    
    return sendResponse(res, result);
  });
}

export default new SaleController();