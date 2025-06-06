"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/measurement.routes.ts
const express_1 = require("express");
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const measurement_controller_1 = require("./measurement.controller");
const measurementRoutes = (0, express_1.Router)();
// Apply authentication middleware to all routes
measurementRoutes.use(verifyAuth_1.verifyAuth);
// Measurement Routes
measurementRoutes.post('/', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.createMeasurement);
measurementRoutes.get('/', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.getAllMeasurements);
measurementRoutes.get('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.getMeasurementById);
measurementRoutes.patch('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.updateMeasurement);
measurementRoutes.delete('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'SUPER_ADMIN', 'KEEPER'), measurement_controller_1.MeasurementController.deleteMeasurement);
// Unit Routes
measurementRoutes.post('/units', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.createUnit);
measurementRoutes.get('/:measurementId/units', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.getUnitsByMeasurementId);
measurementRoutes.get('/units/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.getUnitById);
measurementRoutes.patch('/units/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.updateUnit);
measurementRoutes.delete('/units/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN', 'ACCOUNTANT', 'KEEPER', 'SUPER_ADMIN'), measurement_controller_1.MeasurementController.deleteUnit);
exports.default = measurementRoutes;
