"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeasurementController = void 0;
const measurement_service_1 = require("./measurement.service");
const catchAsync_1 = require("../utils/catchAsync");
const sendResponse_1 = __importDefault(require("../../lib/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
// Measurement Controllers
const createMeasurement = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_service_1.MeasurementService.createMeasurement(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Measurement created successfully',
        data: measurement
    });
}));
const getAllMeasurements = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const measurements = yield measurement_service_1.MeasurementService.getAllMeasurements();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Measurements retrieved successfully',
        data: measurements
    });
}));
const getMeasurementById = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_service_1.MeasurementService.getMeasurementById(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Measurement retrieved successfully',
        data: measurement
    });
}));
const updateMeasurement = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_service_1.MeasurementService.updateMeasurement(req.params.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Measurement updated successfully',
        data: measurement
    });
}));
const deleteMeasurement = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_service_1.MeasurementService.deleteMeasurement(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Measurement deleted successfully',
        data: measurement
    });
}));
// Unit Controllers
const createUnit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_service_1.MeasurementService.createUnit(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: 'Unit created successfully',
        data: unit
    });
}));
const getUnitsByMeasurementId = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const units = yield measurement_service_1.MeasurementService.getUnitsByMeasurementId(req.params.measurementId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Units retrieved successfully',
        data: units
    });
}));
const getUnitById = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_service_1.MeasurementService.getUnitById(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Unit retrieved successfully',
        data: unit
    });
}));
const updateUnit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_service_1.MeasurementService.updateUnit(req.params.id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Unit updated successfully',
        data: unit
    });
}));
const deleteUnit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_service_1.MeasurementService.deleteUnit(req.params.id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: 'Unit deleted successfully',
        data: unit
    });
}));
exports.MeasurementController = {
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
