"use strict";
// src/services/DeliveryNote.service.ts
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
const mongoose_1 = __importDefault(require("mongoose"));
const cloudinary_1 = require("cloudinary");
const uuid_1 = require("uuid");
const Delivery_models_1 = __importDefault(require("./Delivery.models"));
const customError_1 = __importDefault(require("../utils/customError"));
class DeliveryNoteService {
    /**
     * Create a new delivery note
     */
    createDeliveryNote(deliveryNoteData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Generate unique ID for the delivery note if not provided
                if (!deliveryNoteData.id) {
                    deliveryNoteData.id = `DN-${(0, uuid_1.v4)().substring(0, 8).toUpperCase()}`;
                }
                const deliveryNote = yield Delivery_models_1.default.create(deliveryNoteData);
                return deliveryNote.toJSON();
            }
            catch (error) {
                if (error instanceof mongoose_1.default.Error.ValidationError) {
                    throw new customError_1.default(400, `Validation Error: ${error.message}`);
                }
                throw new customError_1.default(500, `Error creating delivery note: ${error.message}`);
            }
        });
    }
    /**
     * Get all delivery notes with pagination and filtering
     */
    getAllDeliveryNotes(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', customerName, startDate, endDate, status } = query;
            const skip = (Number(page) - 1) * Number(limit);
            // Build filter object
            let filter = {};
            if (customerName) {
                filter.customerName = { $regex: customerName, $options: 'i' };
            }
            if (startDate && endDate) {
                filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }
            else if (startDate) {
                filter.date = { $gte: new Date(startDate) };
            }
            else if (endDate) {
                filter.date = { $lte: new Date(endDate) };
            }
            if (status) {
                filter.status = status;
            }
            // Build sort object
            const sort = {};
            sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
            try {
                const [deliveryNotes, total] = yield Promise.all([
                    Delivery_models_1.default.find(filter)
                        .sort(sort)
                        .skip(skip)
                        .limit(Number(limit))
                        .exec(),
                    Delivery_models_1.default.countDocuments(filter)
                ]);
                return {
                    data: deliveryNotes.map(note => note.toJSON()),
                    total,
                    page: Number(page),
                    limit: Number(limit)
                };
            }
            catch (error) {
                throw new customError_1.default(500, `Error fetching delivery notes: ${error.message}`);
            }
        });
    }
    /**
     * Get delivery note by ID
     */
    getDeliveryNoteById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deliveryNote = yield Delivery_models_1.default.findOne({ id }).exec();
                if (!deliveryNote) {
                    throw new customError_1.default(404, `Delivery note with ID ${id} not found`);
                }
                return deliveryNote.toJSON();
            }
            catch (error) {
                if (error instanceof customError_1.default) {
                    throw error;
                }
                throw new customError_1.default(500, `Error fetching delivery note with ID ${id}: ${error.message}`);
            }
        });
    }
    /**
     * Update delivery note by ID
     */
    updateDeliveryNote(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deliveryNote = yield Delivery_models_1.default.findOneAndUpdate({ id }, { $set: updateData }, { new: true, runValidators: true }).exec();
                if (!deliveryNote) {
                    throw new customError_1.default(404, `Delivery note with ID ${id} not found`);
                }
                return deliveryNote.toJSON();
            }
            catch (error) {
                if (error instanceof customError_1.default) {
                    throw error;
                }
                if (error instanceof mongoose_1.default.Error.ValidationError) {
                    throw new customError_1.default(400, `Validation Error: ${error.message}`);
                }
                throw new customError_1.default(500, `Error updating delivery note with ID ${id}: ${error.message}`);
            }
        });
    }
    /**
     * Delete delivery note by ID
     */
    deleteDeliveryNote(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if the delivery note has a proof of delivery URL
                const deliveryNote = yield Delivery_models_1.default.findOne({ id }).exec();
                if (!deliveryNote) {
                    throw new customError_1.default(404, `Delivery note with ID ${id} not found`);
                }
                // If there's a proof of delivery image in Cloudinary, delete it
                if (deliveryNote.proofOfDeliveryUrl) {
                    try {
                        // Extract public_id from URL
                        const publicId = this.getPublicIdFromUrl(deliveryNote.proofOfDeliveryUrl);
                        if (publicId) {
                            yield cloudinary_1.v2.uploader.destroy(publicId);
                        }
                    }
                    catch (cloudinaryError) {
                        console.error('Failed to delete image from Cloudinary:', cloudinaryError);
                        // Continue with deletion even if Cloudinary delete fails
                    }
                }
                // Delete the delivery note document
                yield Delivery_models_1.default.findOneAndDelete({ id }).exec();
            }
            catch (error) {
                if (error instanceof customError_1.default) {
                    throw error;
                }
                throw new customError_1.default(500, `Error deleting delivery note with ID ${id}: ${error.message}`);
            }
        });
    }
    /**
     * Update proof of delivery
     */
    updateProofOfDelivery(id, proofOfDeliveryUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Check if delivery note exists
                const existingNote = yield Delivery_models_1.default.findOne({ id }).exec();
                if (!existingNote) {
                    throw new customError_1.default(404, `Delivery note with ID ${id} not found`);
                }
                // If there's an existing proof of delivery image, delete it from Cloudinary
                if (existingNote.proofOfDeliveryUrl) {
                    try {
                        // Extract public_id from URL
                        const publicId = this.getPublicIdFromUrl(existingNote.proofOfDeliveryUrl);
                        if (publicId) {
                            yield cloudinary_1.v2.uploader.destroy(publicId);
                        }
                    }
                    catch (cloudinaryError) {
                        console.error('Failed to delete previous image from Cloudinary:', cloudinaryError);
                        // Continue with update even if Cloudinary delete fails
                    }
                }
                // Update the delivery note with the new proof URL
                const deliveryNote = yield Delivery_models_1.default.findOneAndUpdate({ id }, {
                    $set: {
                        proofOfDeliveryUrl,
                        status: 'delivered', // Update status to delivered when proof is uploaded
                        deliveredAt: new Date() // Record delivery timestamp
                    }
                }, { new: true }).exec();
                if (!deliveryNote) {
                    throw new customError_1.default(404, `Delivery note with ID ${id} not found`);
                }
                return deliveryNote.toJSON();
            }
            catch (error) {
                if (error instanceof customError_1.default) {
                    throw error;
                }
                throw new customError_1.default(500, `Error updating proof of delivery for note with ID ${id}: ${error.message}`);
            }
        });
    }
    /**
     * Helper method to extract public_id from Cloudinary URL
     */
    getPublicIdFromUrl(url) {
        // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/delivery-proofs/abcdefgh.jpg
        try {
            const urlParts = url.split('/');
            // Get the folder and filename (excluding the file extension)
            const filenameParts = urlParts[urlParts.length - 1].split('.');
            const folderName = urlParts[urlParts.length - 2];
            const filename = filenameParts[0];
            return `${folderName}/${filename}`;
        }
        catch (error) {
            console.error('Error parsing Cloudinary URL:', error);
            return null;
        }
    }
}
exports.default = new DeliveryNoteService();
