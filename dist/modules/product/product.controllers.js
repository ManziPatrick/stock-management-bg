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
//@ts-nocheck
const http_status_1 = __importDefault(require("http-status"));
const asyncHandler_1 = __importDefault(require("../../lib/asyncHandler"));
const sendResponse_1 = __importDefault(require("../../lib/sendResponse"));
const product_services_1 = __importDefault(require("./product.services"));
const cloudinaryConfig_1 = require("../image/cloudinaryConfig");
const customError_1 = __importDefault(require("../utils/customError"));
const mongoose_1 = require("mongoose");
const product_model_1 = __importDefault(require("./product.model"));
const priceFilter_1 = require("../../middlewares/priceFilter");
class ProductControllers {
    constructor() {
        this.services = product_services_1.default;
        /**
         * create new product
         */
        this.create = [
            cloudinaryConfig_1.upload.array('images', 5),
            cloudinaryConfig_1.uploadToCloudinary,
            (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const imageUrls = req.body.cloudinaryUrls || [];
                    // Parse measurement if it's a string
                    let measurement;
                    try {
                        measurement = typeof req.body.measurement === 'string'
                            ? JSON.parse(req.body.measurement)
                            : req.body.measurement;
                        // Fix the measurement structure if it has 'measurement' instead of 'type'
                        if (measurement && measurement.measurement && !measurement.type) {
                            measurement = {
                                type: measurement.measurement,
                                unit: measurement.unit,
                                value: measurement.value
                            };
                        }
                    }
                    catch (error) {
                        throw new customError_1.default(400, 'Invalid measurement format');
                    }
                    // Helper function to safely parse numbers
                    const safeParseNumber = (value) => {
                        if (value === undefined || value === null || value === '') {
                            return undefined;
                        }
                        const num = Number(value);
                        return isNaN(num) || !isFinite(num) ? undefined : num;
                    };
                    // Debug logging to see what we're receiving
                    console.log('Request body fields:', {
                        quantity: req.body.quantity,
                        stock: req.body.stock,
                        price: req.body.price,
                        default_price: req.body.default_price
                    });
                    const productData = Object.assign(Object.assign({ name: req.body.name, seller: new mongoose_1.Types.ObjectId(req.body.seller), category: new mongoose_1.Types.ObjectId(req.body.category) }, (req.body.brand && { brand: new mongoose_1.Types.ObjectId(req.body.brand) })), { price: (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") ? safeParseNumber(req.body.price) : undefined, default_price: safeParseNumber(req.body.default_price), 
                        // Try multiple field names for stock/quantity
                        stock: safeParseNumber(req.body.stock || req.body.quantity), description: req.body.description, unit: req.body.unit, measurement: measurement, images: imageUrls, user: new mongoose_1.Types.ObjectId(req.user._id), createdBy: new mongoose_1.Types.ObjectId(req.user._id) });
                    // Remove undefined fields to keep the payload clean
                    Object.keys(productData).forEach(key => {
                        if (productData[key] === undefined) {
                            delete productData[key];
                        }
                    });
                    console.log('Product data before sending to service:', productData);
                    const result = yield this.services.create(productData, req.user._id, req.user.role);
                    (0, sendResponse_1.default)(res, result);
                }
                catch (error) {
                    console.error('Error in product creation controller:', error);
                    (0, sendResponse_1.default)(res, {
                        success: false,
                        statusCode: error.statusCode || http_status_1.default.INTERNAL_SERVER_ERROR,
                        message: error.message || 'Failed to create product'
                    });
                }
            }))
        ];
        /**
         * Add product to stock
         */
        this.addStock = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.addToStock(req.params.id, req.body, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product stock added successfully!',
                data: result
            });
        }));
        /**
         * Get all products user has access to with query
         */
        this.readAll = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.readAll(req.query, req.user._id);
            console.log("kjk,h");
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            // Filter price fields based on user role
            const filteredData = (0, priceFilter_1.filterPriceFields)(result.data, req.user.role);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'All products retrieved successfully',
                meta: {
                    page,
                    limit,
                    total: (result === null || result === void 0 ? void 0 : result.totalCount) || 0,
                    totalPage: Math.ceil((result === null || result === void 0 ? void 0 : result.totalCount) / limit)
                },
                data: filteredData
            });
        }));
        /**
         * Get total product
         */
        this.getTotalProduct = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.countTotalProduct(req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Count total products successfully',
                data: result
            });
        }));
        /**
         * Get single product of user
         */
        this.readSingle = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.services.read(req.params.id, req.user._id);
            // Filter price fields based on user role
            const filteredData = (0, priceFilter_1.filterPriceFields)(result, req.user.role);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product fetched successfully!',
                data: filteredData
            });
        }));
        /**
         * update product
         */
        this.updateProduct = [
            cloudinaryConfig_1.upload.array('images', 5),
            cloudinaryConfig_1.uploadToCloudinary,
            (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { id } = req.params;
                    const updatePurchases = req.query.updatePurchases === 'true';
                    const imageUrls = req.body.cloudinaryUrls || [];
                    // Parse measurement if it's a string
                    let measurement;
                    try {
                        measurement = typeof req.body.measurement === 'string'
                            ? JSON.parse(req.body.measurement)
                            : req.body.measurement;
                        // Fix the measurement structure if it has 'measurement' instead of 'type'
                        if (measurement && measurement.measurement && !measurement.type) {
                            measurement = {
                                type: measurement.measurement,
                                unit: measurement.unit,
                                value: measurement.value
                            };
                        }
                    }
                    catch (error) {
                        throw new customError_1.default(400, 'Invalid measurement format');
                    }
                    // Helper function to safely parse numbers
                    const safeParseNumber = (value) => {
                        if (value === undefined || value === null || value === '') {
                            return undefined;
                        }
                        const num = Number(value);
                        return isNaN(num) || !isFinite(num) ? undefined : num;
                    };
                    // Debug logging to see what we're receiving
                    console.log('Update request body fields:', {
                        quantity: req.body.quantity,
                        stock: req.body.stock,
                        price: req.body.price,
                        default_price: req.body.default_price
                    });
                    const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (req.body.name && { name: req.body.name })), (req.body.seller && { seller: new mongoose_1.Types.ObjectId(req.body.seller) })), (req.body.category && { category: new mongoose_1.Types.ObjectId(req.body.category) })), (req.body.brand && { brand: new mongoose_1.Types.ObjectId(req.body.brand) })), { 
                        // Only ADMIN and SUPER_ADMIN can update original price
                        price: (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN") ? safeParseNumber(req.body.price) : undefined, default_price: safeParseNumber(req.body.default_price) }), (req.body.stock !== undefined && { stock: safeParseNumber(req.body.stock || req.body.quantity) })), (req.body.description && { description: req.body.description })), (req.body.unit && { unit: req.body.unit })), (measurement && { measurement: measurement })), (imageUrls.length > 0 && { images: imageUrls }));
                    // Remove undefined fields to keep the payload clean
                    Object.keys(updateData).forEach(key => {
                        if (updateData[key] === undefined) {
                            delete updateData[key];
                        }
                    });
                    console.log('Product update data before sending to service:', updateData);
                    const result = yield this.services.update(id, updateData, {
                        updatePurchases,
                        userId: req.user._id,
                        userRole: req.user.role
                    });
                    (0, sendResponse_1.default)(res, {
                        success: true,
                        statusCode: http_status_1.default.OK,
                        message: 'Product updated successfully!',
                        data: result,
                    });
                }
                catch (error) {
                    console.error('Error in product update controller:', error);
                    (0, sendResponse_1.default)(res, {
                        success: false,
                        statusCode: error.statusCode || http_status_1.default.INTERNAL_SERVER_ERROR,
                        message: error.message || 'Failed to update product'
                    });
                }
            }))
        ];
        // New controller specifically for price updates (ADMIN/SUPER_ADMIN only)
        this.updatePrice = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const updatePurchases = req.query.updatePurchases === 'true';
                // Helper function to safely parse numbers
                const safeParseNumber = (value) => {
                    if (value === undefined || value === null || value === '') {
                        return undefined;
                    }
                    const num = Number(value);
                    return isNaN(num) || !isFinite(num) ? undefined : num;
                };
                // Only allow price and default_price updates
                const priceUpdateData = Object.assign(Object.assign({}, (req.body.price !== undefined && { price: safeParseNumber(req.body.price) })), (req.body.default_price !== undefined && { default_price: safeParseNumber(req.body.default_price) }));
                // Validate that at least one price field is provided
                if (Object.keys(priceUpdateData).length === 0) {
                    throw new customError_1.default(400, 'At least one price field (price or default_price) must be provided');
                }
                console.log('Price update data:', priceUpdateData);
                const result = yield this.services.update(id, priceUpdateData, {
                    updatePurchases,
                    userId: req.user._id,
                    userRole: req.user.role
                });
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.OK,
                    message: 'Product price updated successfully!',
                    data: result,
                });
            }
            catch (error) {
                console.error('Error in product price update controller:', error);
                (0, sendResponse_1.default)(res, {
                    success: false,
                    statusCode: error.statusCode || http_status_1.default.INTERNAL_SERVER_ERROR,
                    message: error.message || 'Failed to update product price'
                });
            }
        }));
        this.readAllPublic = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // console.log("hhjkkkiiuun",req)
                // If user is not authenticated, pass a default ID or null to the service
                const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a._id) || null;
                console.log("hh000jkkkiiuun", userId);
                const result = yield this.services.readAllPublic(req.query, userId);
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 10;
                // Filter price fields based on user role (for public, treat as non-admin)
                const filteredData = (0, priceFilter_1.filterPriceFields)(result.data, (_b = req.user) === null || _b === void 0 ? void 0 : _b.role);
                // Return the response with pagination data
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.OK,
                    message: 'All products retrieved successfully',
                    meta: {
                        page,
                        limit,
                        total: (result === null || result === void 0 ? void 0 : result.totalCount) || 0,
                        totalPage: Math.ceil((result === null || result === void 0 ? void 0 : result.totalCount) / limit),
                        summary: (result === null || result === void 0 ? void 0 : result.summary) || null,
                    },
                    data: filteredData,
                });
            }
            catch (error) {
                console.error(error);
                (0, sendResponse_1.default)(res, {
                    success: false,
                    statusCode: http_status_1.default.INTERNAL_SERVER_ERROR,
                    message: 'Failed to retrieve products',
                });
            }
        }));
        /**
         * delete product
         */
        this.delete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.delete(req.params.id, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Product delete successfully!'
            });
        }));
        /**
         * Get collection discrepancies
         */
        this.getCollectionDiscrepancies = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Default pagination
                const page = Number(req.query.page) || 1;
                const limit = Number(req.query.limit) || 10;
                const skip = (page - 1) * limit;
                // Get accessible user IDs for filtering
                const accessibleUserIds = yield this.services.getAccessibleUserIds(req.user._id);
                // Aggregate pipeline to find discrepancies
                const discrepancies = yield product_model_1.default.aggregate([
                    // First, filter by accessible users
                    {
                        $match: {
                            $or: [
                                { user: { $in: accessibleUserIds } },
                                { createdBy: new mongoose_1.Types.ObjectId(req.user._id) }
                            ]
                        }
                    },
                    // Lookup purchases for each product
                    {
                        $lookup: {
                            from: 'purchases',
                            localField: '_id',
                            foreignField: 'product',
                            as: 'purchases'
                        }
                    },
                    // Unwind purchases array to compare each purchase
                    { $unwind: '$purchases' },
                    // Match documents where there are differences
                    {
                        $match: {
                            $or: [
                                // Compare measurement type
                                { $expr: { $ne: ['$measurement.type', '$purchases.measurement.type'] } },
                                // Compare measurement value
                                { $expr: { $ne: ['$measurement.value', '$purchases.measurement.value'] } },
                                // Compare measurement unit
                                { $expr: { $ne: ['$measurement.unit', '$purchases.measurement.unit'] } },
                                // Compare price with unitPrice
                                { $expr: { $ne: ['$price', '$purchases.unitPrice'] } }
                            ]
                        }
                    },
                    // Group back by product to avoid duplicates
                    {
                        $group: {
                            _id: '$_id',
                            product: { $first: '$$ROOT' },
                            discrepantPurchases: {
                                $push: {
                                    purchaseId: '$purchases._id',
                                    purchaseMeasurement: '$purchases.measurement',
                                    purchaseUnitPrice: '$purchases.unitPrice',
                                    purchaseDate: '$purchases.createdAt'
                                }
                            }
                        }
                    },
                    // Add additional product fields
                    {
                        $project: {
                            _id: 1,
                            name: '$product.name',
                            productMeasurement: '$product.measurement',
                            productPrice: '$product.price',
                            discrepantPurchases: 1,
                            totalDiscrepancies: { $size: '$discrepantPurchases' }
                        }
                    },
                    // Skip and limit for pagination
                    { $skip: skip },
                    { $limit: limit }
                ]);
                // Get total count for pagination with the same user access filtering
                const totalCount = yield product_model_1.default.aggregate([
                    // First, filter by accessible users
                    {
                        $match: {
                            $or: [
                                { user: { $in: accessibleUserIds } },
                                { createdBy: new mongoose_1.Types.ObjectId(req.user._id) }
                            ]
                        }
                    },
                    { $lookup: { from: 'purchases', localField: '_id', foreignField: 'product', as: 'purchases' } },
                    { $unwind: '$purchases' },
                    {
                        $match: {
                            $or: [
                                { $expr: { $ne: ['$measurement.type', '$purchases.measurement.type'] } },
                                { $expr: { $ne: ['$measurement.value', '$purchases.measurement.value'] } },
                                { $expr: { $ne: ['$measurement.unit', '$purchases.measurement.unit'] } },
                                { $expr: { $ne: ['$price', '$purchases.unitPrice'] } }
                            ]
                        }
                    },
                    { $group: { _id: '$_id' } },
                    { $count: 'total' }
                ]);
                const total = ((_a = totalCount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0;
                // Send response
                (0, sendResponse_1.default)(res, {
                    success: true,
                    statusCode: http_status_1.default.OK,
                    message: 'Collection discrepancies retrieved successfully',
                    meta: {
                        page,
                        limit,
                        total,
                        totalPage: Math.ceil(total / limit)
                    },
                    data: discrepancies.map(item => ({
                        productId: item._id,
                        productName: item.name,
                        productMeasurement: item.productMeasurement,
                        productPrice: item.productPrice,
                        discrepantPurchases: item.discrepantPurchases,
                        totalDiscrepancies: item.totalDiscrepancies
                    }))
                });
            }
            catch (error) {
                (0, sendResponse_1.default)(res, {
                    success: false,
                    statusCode: error.statusCode || http_status_1.default.INTERNAL_SERVER_ERROR,
                    message: error.message || 'Failed to retrieve collection discrepancies'
                });
            }
        }));
        /**
         * Bulk delete products
         */
        this.bulkDelete = (0, asyncHandler_1.default)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.services.bulkDelete(req.body.ids, req.user._id);
            (0, sendResponse_1.default)(res, {
                success: true,
                statusCode: http_status_1.default.OK,
                message: 'Delete Selected Products successfully!'
            });
        }));
    }
}
const productControllers = new ProductControllers();
exports.default = productControllers;
