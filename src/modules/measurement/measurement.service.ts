// src/services/measurement.service.ts
import { IMeasurement, IUnit } from './measurement.types';
import { Measurement, Unit } from './measurement.model';
import { AppError } from '../utils/appError';
import httpStatus from 'http-status';

// Measurement Services
const createMeasurement = async (measurementData: IMeasurement): Promise<IMeasurement> => {
  try {
    const measurement = await Measurement.create(measurementData);
    return measurement;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError('Measurement with this name already exists', httpStatus.CONFLICT);
    }
    throw error;
  }
};

const getAllMeasurements = async (): Promise<IMeasurement[]> => {
  const measurements = await Measurement.find().sort({ name: 1 });
  return measurements;
};

const getMeasurementById = async (id: string): Promise<IMeasurement> => {
  const measurement = await Measurement.findById(id);
  if (!measurement) {
    throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
  }
  return measurement;
};

const updateMeasurement = async (
  id: string,
  updateData: Partial<IMeasurement>
): Promise<IMeasurement> => {
  const measurement = await Measurement.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  if (!measurement) {
    throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
  }

  return measurement;
};

const deleteMeasurement = async (id: string): Promise<IMeasurement> => {
  const unitCount = await Unit.countDocuments({ measurementId: id });

  if (unitCount > 0) {
    throw new AppError('Cannot delete measurement that has associated units', httpStatus.BAD_REQUEST);
  }

  const measurement = await Measurement.findByIdAndDelete(id);

  if (!measurement) {
    throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
  }

  return measurement;
};

// Unit Services
const createUnit = async (unitData: IUnit): Promise<IUnit> => {
  try {
    const measurementExists = await Measurement.exists({ _id: unitData.measurementId });

    if (!measurementExists) {
      throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
    }

    const unit = await Unit.create(unitData);
    return unit;
  } catch (error: any) {
    if (error.code === 11000) {
      throw new AppError(
        'Unit with this name or symbol already exists for this measurement',
        httpStatus.CONFLICT
      );
    }
    throw error;
  }
};

const getUnitsByMeasurementId = async (measurementId: string): Promise<IUnit[]> => {
  const measurementExists = await Measurement.exists({ _id: measurementId });

  if (!measurementExists) {
    throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
  }

  const units = await Unit.find({ measurementId }).sort({ name: 1 });
  return units;
};

const getUnitById = async (id: string): Promise<IUnit> => {
  const unit = await Unit.findById(id);

  if (!unit) {
    throw new AppError('Unit not found', httpStatus.NOT_FOUND);
  }

  return unit;
};

const updateUnit = async (id: string, updateData: Partial<IUnit>): Promise<IUnit> => {
  if (updateData.measurementId) {
    const measurementExists = await Measurement.exists({ _id: updateData.measurementId });

    if (!measurementExists) {
      throw new AppError('Measurement not found', httpStatus.NOT_FOUND);
    }
  }

  const unit = await Unit.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true
  });

  if (!unit) {
    throw new AppError('Unit not found', httpStatus.NOT_FOUND);
  }

  return unit;
};

const deleteUnit = async (id: string): Promise<IUnit> => {
  const unit = await Unit.findByIdAndDelete(id);

  if (!unit) {
    throw new AppError('Unit not found', httpStatus.NOT_FOUND);
  }

  return unit;
};

export const MeasurementService = {
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
export default MeasurementService;