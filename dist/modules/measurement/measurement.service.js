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
exports.MeasurementService = void 0;
const measurement_model_1 = require("./measurement.model");
const appError_1 = require("../utils/appError");
const http_status_1 = __importDefault(require("http-status"));
// Measurement Services
const createMeasurement = (measurementData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const measurement = yield measurement_model_1.Measurement.create(measurementData);
        return measurement;
    }
    catch (error) {
        if (error.code === 11000) {
            throw new appError_1.AppError('Measurement with this name already exists', http_status_1.default.CONFLICT);
        }
        throw error;
    }
});
const getAllMeasurements = () => __awaiter(void 0, void 0, void 0, function* () {
    const measurements = yield measurement_model_1.Measurement.find().sort({ name: 1 });
    return measurements;
});
const getMeasurementById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_model_1.Measurement.findById(id);
    if (!measurement) {
        throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
    }
    return measurement;
});
const updateMeasurement = (id, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    const measurement = yield measurement_model_1.Measurement.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
    if (!measurement) {
        throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
    }
    return measurement;
});
const deleteMeasurement = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const unitCount = yield measurement_model_1.Unit.countDocuments({ measurementId: id });
    if (unitCount > 0) {
        throw new appError_1.AppError('Cannot delete measurement that has associated units', http_status_1.default.BAD_REQUEST);
    }
    const measurement = yield measurement_model_1.Measurement.findByIdAndDelete(id);
    if (!measurement) {
        throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
    }
    return measurement;
});
// Unit Services
const createUnit = (unitData) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const measurementExists = yield measurement_model_1.Measurement.exists({ _id: unitData.measurementId });
        if (!measurementExists) {
            throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
        }
        const unit = yield measurement_model_1.Unit.create(unitData);
        return unit;
    }
    catch (error) {
        if (error.code === 11000) {
            throw new appError_1.AppError('Unit with this name or symbol already exists for this measurement', http_status_1.default.CONFLICT);
        }
        throw error;
    }
});
const getUnitsByMeasurementId = (measurementId) => __awaiter(void 0, void 0, void 0, function* () {
    const measurementExists = yield measurement_model_1.Measurement.exists({ _id: measurementId });
    if (!measurementExists) {
        throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
    }
    const units = yield measurement_model_1.Unit.find({ measurementId }).sort({ name: 1 });
    return units;
});
const getUnitById = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_model_1.Unit.findById(id);
    if (!unit) {
        throw new appError_1.AppError('Unit not found', http_status_1.default.NOT_FOUND);
    }
    return unit;
});
const updateUnit = (id, updateData) => __awaiter(void 0, void 0, void 0, function* () {
    if (updateData.measurementId) {
        const measurementExists = yield measurement_model_1.Measurement.exists({ _id: updateData.measurementId });
        if (!measurementExists) {
            throw new appError_1.AppError('Measurement not found', http_status_1.default.NOT_FOUND);
        }
    }
    const unit = yield measurement_model_1.Unit.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true
    });
    if (!unit) {
        throw new appError_1.AppError('Unit not found', http_status_1.default.NOT_FOUND);
    }
    return unit;
});
const deleteUnit = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const unit = yield measurement_model_1.Unit.findByIdAndDelete(id);
    if (!unit) {
        throw new appError_1.AppError('Unit not found', http_status_1.default.NOT_FOUND);
    }
    return unit;
});
exports.MeasurementService = {
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
exports.default = exports.MeasurementService;
