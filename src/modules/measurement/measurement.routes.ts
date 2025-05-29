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
  authorizeRoles('KEEPER','ADMIN', 'ACCOUNTANT','SUPER_ADMIN'),
  MeasurementController.createMeasurement
);

measurementRoutes.get(
  '/',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER','SUPER_ADMIN'),
  MeasurementController.getAllMeasurements
);

measurementRoutes.get(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER','SUPER_ADMIN'),
  MeasurementController.getMeasurementById
);

measurementRoutes.patch(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER','SUPER_ADMIN'),
  MeasurementController.updateMeasurement
);

measurementRoutes.delete(
  '/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT','SUPER_ADMIN', 'KEEPER'),
  MeasurementController.deleteMeasurement
);

// Unit Routes
measurementRoutes.post(
  '/units',
  authorizeRoles('ADMIN', 'ACCOUNTANT','KEEPER','SUPER_ADMIN'),
  MeasurementController.createUnit
);

measurementRoutes.get(
  '/:measurementId/units',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER','SUPER_ADMIN'),
  MeasurementController.getUnitsByMeasurementId
);

measurementRoutes.get(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT', 'KEEPER','SUPER_ADMIN'),
  MeasurementController.getUnitById
);

measurementRoutes.patch(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT','KEEPER','SUPER_ADMIN'),
 
  MeasurementController.updateUnit
);

measurementRoutes.delete(
  '/units/:id',
  authorizeRoles('ADMIN', 'ACCOUNTANT','KEEPER','SUPER_ADMIN'),
  MeasurementController.deleteUnit
);

export default measurementRoutes;
