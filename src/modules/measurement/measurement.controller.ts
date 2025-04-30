// src/controllers/measurement.controller.ts
import { Request, Response } from 'express';
import { MeasurementService } from './measurement.service';
import {catchAsync} from '../utils/catchAsync';
import sendResponse from '../../lib/sendResponse';
import httpStatus from 'http-status';

// Measurement Controllers
const createMeasurement = catchAsync(async (req: Request, res: Response) => {
  const measurement = await MeasurementService.createMeasurement(req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Measurement created successfully',
    data: measurement
  });
});

const getAllMeasurements = catchAsync(async (req: Request, res: Response) => {
  const measurements = await MeasurementService.getAllMeasurements();
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Measurements retrieved successfully',
    data: measurements
  });
});

const getMeasurementById = catchAsync(async (req: Request, res: Response) => {
  const measurement = await MeasurementService.getMeasurementById(req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Measurement retrieved successfully',
    data: measurement
  });
});

const updateMeasurement = catchAsync(async (req: Request, res: Response) => {
  const measurement = await MeasurementService.updateMeasurement(req.params.id, req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Measurement updated successfully',
    data: measurement
  });
});

const deleteMeasurement = catchAsync(async (req: Request, res: Response) => {
  const measurement = await MeasurementService.deleteMeasurement(req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Measurement deleted successfully',
    data: measurement
  });
});

// Unit Controllers
const createUnit = catchAsync(async (req: Request, res: Response) => {
  const unit = await MeasurementService.createUnit(req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Unit created successfully',
    data: unit
  });
});

const getUnitsByMeasurementId = catchAsync(async (req: Request, res: Response) => {
  const units = await MeasurementService.getUnitsByMeasurementId(req.params.measurementId);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Units retrieved successfully',
    data: units
  });
});

const getUnitById = catchAsync(async (req: Request, res: Response) => {
  const unit = await MeasurementService.getUnitById(req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unit retrieved successfully',
    data: unit
  });
});

const updateUnit = catchAsync(async (req: Request, res: Response) => {
  const unit = await MeasurementService.updateUnit(req.params.id, req.body);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unit updated successfully',
    data: unit
  });
});

const deleteUnit = catchAsync(async (req: Request, res: Response) => {
  const unit = await MeasurementService.deleteUnit(req.params.id);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Unit deleted successfully',
    data: unit
  });
});

export const MeasurementController = {
  createMeasurement,
  getAllMeasurements,
  getMeasurementById,
  updateMeasurement,
  deleteMeasurement,
  createUnit,
  getUnitsByMeasurementId,
  getUnitById,
  updateUnit,
  deleteUnit
};