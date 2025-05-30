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
      sortOrder: (req.query.sortOrder as string || 'desc').toLowerCase(),
      filterBy: req.query.filterBy as string || 'daily',
      status: req.query.status as string,
      inventoryStatus: req.query.inventoryStatus as string,
      collectionStatus: req.query.collectionStatus as string,
      userId: req.user._id,         
      userRole: req.user.role
    };

    console.log(query, 'query');
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

  
  readAllInventoryStatus = asyncHandler(async (req: Request, res: Response) => {
    const query = {
      search: req.query.search as string || '',
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as string || 'desc').toLowerCase(),
      filterBy: req.query.filterBy as string || 'daily',
      status: req.query.status as string,
      inventoryStatus: req.query.inventoryStatus as string,
      collectionStatus: req.query.collectionStatus as string,
      userId: req.user._id,         
      userRole: req.user.role
    };

    console.log(query, 'query');
    const result = await saleServices.getAllWithInventoryStatus(query);
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

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected', 'credit'].includes(status)) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const result = await saleServices.updateStatus(id, status);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Sale ${status} successfully`,
      data: result
    });
  });

  markProductsCollected = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { collected } = req.body;
    
    const result = await saleServices.markProductsCollected(id, collected);
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Products collection status updated successfully`,
      data: result
    });
  });

  getTotalCredit = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const result = await saleServices.getTotalCredit(user._id);
    
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Credit statistics retrieved successfully',
      data: result.data
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
      // userId: user._id
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
      // userId: user._id
    });
    
    return sendResponse(res, result);
  });

  readAllYearly = asyncHandler(async (req: Request, res: Response) => {
    const { user } = req;
    const { startYear, endYear } = req.query;
    const result = await saleServices.readAllYearly({
      startYear: startYear as string,
      endYear: endYear as string,
      // userId: user._id
    });
    
    return sendResponse(res, result);
  });
}

export default new SaleController();