// src/models/measurement.model.ts
import { Schema, model } from 'mongoose';
import { IMeasurement, IUnit } from './measurement.types';

const measurementSchema = new Schema<IMeasurement>(
  {
    name: {
      type: String,
      required: [true, 'Measurement name is required'],
      trim: true,
      unique: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    }
  }
);

const unitSchema = new Schema<IUnit>(
  {
    name: {
      type: String,
      required: [true, 'Unit name is required'],
      trim: true
    },
    symbol: {
      type: String,
      required: [true, 'Unit symbol is required'],
      trim: true
    },
    measurementId: {
      type: Schema.Types.ObjectId,
      ref: 'Measurement',
      required: [true, 'Measurement ID is required']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    }
  }
);

// Create compound index to ensure uniqueness of unit name within a measurement
unitSchema.index({ name: 1, measurementId: 1 }, { unique: true });
unitSchema.index({ symbol: 1, measurementId: 1 }, { unique: true });

export const Measurement = model<IMeasurement>('Measurement', measurementSchema);
export const Unit = model<IUnit>('Unit', unitSchema);