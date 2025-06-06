"use strict";
// src/controllers/DeliveryNote.controller.ts
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
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
const Delivery_service_1 = __importDefault(require("./Delivery.service"));
const customError_1 = __importDefault(require("../utils/customError"));
class DeliveryNoteController {
    /**
     * Create a new delivery note
     */
    createDeliveryNote(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deliveryNoteData = req.body;
                const deliveryNote = yield Delivery_service_1.default.createDeliveryNote(deliveryNoteData);
                res.status(201).json({
                    success: true,
                    message: 'Delivery note created successfully',
                    data: deliveryNote
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get all delivery notes with pagination and filtering
     */
    getAllDeliveryNotes(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = req.query;
                const result = yield Delivery_service_1.default.getAllDeliveryNotes(query);
                res.status(200).json({
                    success: true,
                    message: 'Delivery notes fetched successfully',
                    data: result.data,
                    meta: {
                        total: result.total,
                        page: result.page,
                        limit: result.limit
                    }
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Get delivery note by ID
     */
    getDeliveryNoteById(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const deliveryNote = yield Delivery_service_1.default.getDeliveryNoteById(id);
                res.status(200).json({
                    success: true,
                    message: 'Delivery note fetched successfully',
                    data: deliveryNote
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Update delivery note by ID
     */
    updateDeliveryNote(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updateData = req.body;
                const updatedDeliveryNote = yield Delivery_service_1.default.updateDeliveryNote(id, updateData);
                res.status(200).json({
                    success: true,
                    message: 'Delivery note updated successfully',
                    data: updatedDeliveryNote
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Delete delivery note by ID
     */
    deleteDeliveryNote(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield Delivery_service_1.default.deleteDeliveryNote(id);
                res.status(200).json({
                    success: true,
                    message: 'Delivery note deleted successfully'
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    /**
     * Upload proof of delivery
     */
    uploadProofOfDelivery(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            let localFilePath = '';
            try {
                const { id } = req.params;
                // Check if file exists in the request
                if (!req.file) {
                    throw new customError_1.default(400, 'No file uploaded');
                }
                localFilePath = req.file.path;
                // Upload to Cloudinary using the configuration from routes file
                const cloudinaryResult = yield cloudinary_1.v2.uploader.upload(localFilePath, {
                    folder: 'delivery-proofs',
                    resource_type: 'auto'
                });
                if (!cloudinaryResult || !cloudinaryResult.secure_url) {
                    throw new customError_1.default(500, 'Failed to upload to Cloudinary');
                }
                // Update delivery note with the proof URL
                const updatedDeliveryNote = yield Delivery_service_1.default.updateProofOfDelivery(id, cloudinaryResult.secure_url);
                // Clean up the local file after successful upload
                fs_1.default.unlinkSync(localFilePath);
                localFilePath = '';
                res.status(200).json({
                    success: true,
                    message: 'Proof of delivery uploaded successfully',
                    data: {
                        proofOfDeliveryUrl: cloudinaryResult.secure_url,
                        deliveryNote: updatedDeliveryNote
                    }
                });
            }
            catch (error) {
                console.error('Error in uploadProofOfDelivery:', error);
                // Clean up local file if it exists and an error occurred
                if (localFilePath) {
                    try {
                        fs_1.default.unlinkSync(localFilePath);
                    }
                    catch (unlinkError) {
                        console.error('Failed to clean up uploaded file:', unlinkError);
                    }
                }
                if (error instanceof customError_1.default) {
                    next(error);
                }
                else {
                    next(new customError_1.default(500, `Error uploading proof: ${error.message}`));
                }
            }
        });
    }
}
exports.default = new DeliveryNoteController();
