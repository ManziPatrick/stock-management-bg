// src/routes/measurement.routes.ts
import { Router } from 'express';
import { verifyAuth, authorizeRoles } from '../../middlewares/verifyAuth';

import { MeasurementController } from './measurement.controller';


const measurementRoutes = Router();

// Apply authentication middleware to all routes
measurementRoutes.use(verifyAuth);

// Measurement Routes
measurementRoutes.post(
  '/',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  MeasurementController.createMeasurement
);

measurementRoutes.get(
  '/',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER'),
  MeasurementController.getAllMeasurements
);

measurementRoutes.get(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER'),
  MeasurementController.getMeasurementById
);

measurementRoutes.patch(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  MeasurementController.updateMeasurement
);

measurementRoutes.delete(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  MeasurementController.deleteMeasurement
);

// Unit Routes
measurementRoutes.post(
  '/units',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  MeasurementController.createUnit
);

measurementRoutes.get(
  '/:measurementId/units',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER'),
  MeasurementController.getUnitsByMeasurementId
);

measurementRoutes.get(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER'),
  MeasurementController.getUnitById
);

measurementRoutes.patch(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
 
  MeasurementController.updateUnit
);

measurementRoutes.delete(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT'),
  MeasurementController.deleteUnit
);

export default measurementRoutes;
