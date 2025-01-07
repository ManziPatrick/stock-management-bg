"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const mongoose_1 = __importStar(require("mongoose"));
const baseServices_1 = __importDefault(require("../baseServices"));
const product_model_1 = __importDefault(require("./product.model"));
const purchase_model_1 = __importDefault(require("../purchase/purchase.model"));
const user_model_1 = __importDefault(require("../user/user.model"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const seller_model_1 = __importDefault(require("../seller/seller.model"));
const customError_1 = __importDefault(require("../../errors/customError"));
class ProductServices extends baseServices_1.default {
    constructor(model, modelName) {
        super(model, modelName);
        this.transporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    buildMatchStage(query, userId) {
        return {
            $match: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (userId && { user: new mongoose_1.Types.ObjectId(userId) })), (query.name && {
                $or: [
                    { name: { $regex: query.name, $options: 'i' } },
                    { description: { $regex: query.name, $options: 'i' } }
                ]
            })), (query.category && { category: new mongoose_1.Types.ObjectId(query.category) })), (query.brand && { brand: new mongoose_1.Types.ObjectId(query.brand) })), (query.seller && { seller: new mongoose_1.Types.ObjectId(query.seller) })), (query.minPrice && { price: { $gte: Number(query.minPrice) } })), (query.maxPrice && { price: { $lte: Number(query.maxPrice) } }))
        };
    }
    buildPipeline(matchStage, query) {
        return [
            matchStage,
            {
                $sort: {
                    [query.sortBy || 'createdAt']: query.sortOrder === 'asc' ? 1 : -1
                }
            },
            {
                $skip: (Number(query.page || 1) - 1) * Number(query.limit || 10)
            },
            {
                $limit: Number(query.limit || 10)
            }
        ];
    }
    getAdminAndKeeperEmails() {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield user_model_1.default.find({
                role: { $in: ['ADMIN', 'KEEPER'] },
                status: 'ACTIVE'
            });
            const emails = users.map(user => user.email);
            console.log('Found admin and keeper emails:', emails);
            return emails;
        });
    }
    sendProductNotification(product, action, details) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Starting product notification for:', product.name);
                const recipients = yield this.getAdminAndKeeperEmails();
                console.log('Recipients for product notification:', recipients);
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: recipients.join(', '),
                    subject: `Product ${action}: ${product.name}`,
                    html: `
          <h2>Product ${action} Notification</h2>
          <p>Product: ${product.name}</p>
          <p>Action: ${action}</p>
          ${details ? `<p>${details}</p>` : ''}
          <p>Current Stock: ${product.stock}</p>
          <p>Price: ${product.price}</p>
          <p>Category: ${product.category}</p>
          <p>Time: ${new Date().toLocaleString()}</p>
        `
                };
                console.log('Sending email with options:', {
                    from: mailOptions.from,
                    to: mailOptions.to,
                    subject: mailOptions.subject
                });
                yield this.transporter.sendMail(mailOptions);
                console.log('Product notification sent successfully');
            }
            catch (error) {
                console.error('Error in sendProductNotification:', error);
                // Log specific error details
                if (error instanceof Error) {
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
            }
        });
    }
    sendStockNotification(product, seller) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('Starting stock notification for:', product.name);
                const recipients = yield this.getAdminAndKeeperEmails();
                recipients.push(seller.email);
                console.log('Recipients for stock notification:', recipients);
                const stockStatus = product.stock === 0 ? 'Out of Stock' : 'Low Stock';
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: recipients.join(', '),
                    subject: `${stockStatus} Alert: ${product.name}`,
                    html: `
          <h2>${stockStatus} Alert</h2>
          <p>Product: ${product.name}</p>
          <p>Current Stock: ${product.stock}</p>
          <p>Status: ${stockStatus}</p>
          <p>Seller: ${seller.name}</p>
          ${product.stock === 0
                        ? '<p style="color: red;"><strong>URGENT: Product is out of stock!</strong></p>'
                        : '<p style="color: orange;"><strong>Warning: Stock level is low!</strong></p>'}
          <p>Please update your inventory soon.</p>
        `
                };
                console.log('Sending stock notification email with options:', {
                    from: mailOptions.from,
                    to: mailOptions.to,
                    subject: mailOptions.subject
                });
                yield this.transporter.sendMail(mailOptions);
                console.log('Stock notification sent successfully');
            }
            catch (error) {
                console.error('Error in sendStockNotification:', error);
                // Log specific error details
                if (error instanceof Error) {
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    console.error('Error stack:', error.stack);
                }
            }
        });
    }
    checkAndNotifyStock(product, minStockAlert) {
        return __awaiter(this, void 0, void 0, function* () {
            const stockThreshold = minStockAlert !== null && minStockAlert !== void 0 ? minStockAlert : 5; // Use provided value or default to 5
            console.log('Checking stock for product:', product.name, 'Current stock:', product.stock, 'Threshold:', stockThreshold);
            if (product.stock <= stockThreshold) {
                console.log('Low stock detected, fetching seller information');
                const seller = yield seller_model_1.default.findById(product.seller);
                if (seller) {
                    console.log('Seller found:', seller.name);
                    yield this.sendStockNotification(product, seller);
                }
                else {
                    console.log('Seller not found for product:', product.name);
                }
            }
        });
    }
    // Rest of your existing methods with added notification calls
    validateMeasurement(measurement) {
        const unitMappings = {
            weight: ['g', 'kg', 'lb'],
            length: ['cm', 'm', 'inch'],
            volume: ['ml', 'l', 'oz'],
            pieces: ['pc', 'dozen', 'set'],
            size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'XXL', 'XXXL',
                'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42',
                'EU_43', 'EU_44', 'EU_45', 'EU_46', 'EU_47']
        };
        return (measurement.type in unitMappings &&
            unitMappings[measurement.type].includes(measurement.unit) &&
            (measurement.type === 'size' || typeof measurement.value === 'number'));
    }
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productData = Object.assign(Object.assign(Object.assign(Object.assign({}, payload), { user: new mongoose_1.Types.ObjectId(userId), seller: new mongoose_1.Types.ObjectId(payload.seller), category: new mongoose_1.Types.ObjectId(payload.category) }), (payload.brand && { brand: new mongoose_1.Types.ObjectId(payload.brand) })), { stock: Number(payload.stock) });
                const seller = yield seller_model_1.default.findById(payload.seller);
                if (!seller) {
                    throw new customError_1.default(404, 'Seller not found');
                }
                if (payload.measurement) {
                    if (!this.validateMeasurement(payload.measurement)) {
                        throw new customError_1.default(400, 'Invalid measurement data');
                    }
                }
                const product = yield this.model.create(productData);
                // Send notification for new product
                yield this.sendProductNotification(product, 'Created');
                yield this.checkAndNotifyStock(product);
                return {
                    success: true,
                    statusCode: 201,
                    message: 'Product created successfully',
                    data: product
                };
            }
            catch (error) {
                if (error.name === 'ValidationError') {
                    throw new customError_1.default(400, Object.values(error.errors).map((err) => err.message).join(', '));
                }
                if (error.code === 11000) {
                    throw new customError_1.default(400, 'Duplicate product entry');
                }
                throw new customError_1.default(500, 'Failed to create product');
            }
        });
    }
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (payload.measurement) {
                    if (!this.validateMeasurement(payload.measurement)) {
                        throw new customError_1.default(400, 'Invalid measurement data');
                    }
                }
                const updatedProduct = yield this.model.findByIdAndUpdate(id, Object.assign(Object.assign(Object.assign(Object.assign({}, payload), (payload.seller && { seller: new mongoose_1.Types.ObjectId(payload.seller) })), (payload.category && { category: new mongoose_1.Types.ObjectId(payload.category) })), (payload.brand && { brand: new mongoose_1.Types.ObjectId(payload.brand) })), { new: true }).populate([
                    { path: 'category', select: '-__v -user' },
                    { path: 'brand', select: '-__v -user' },
                    { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
                ]);
                if (!updatedProduct) {
                    throw new customError_1.default(404, 'Product not found');
                }
                // Send notification for product update
                yield this.sendProductNotification(updatedProduct, 'Updated');
                yield this.checkAndNotifyStock(updatedProduct);
                return updatedProduct;
            }
            catch (error) {
                if (error instanceof customError_1.default)
                    throw error;
                throw new customError_1.default(400, 'Product update failed');
            }
        });
    }
    addToStock(id, payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = yield mongoose_1.default.startSession();
            session.startTransaction();
            try {
                const seller = yield seller_model_1.default.findById(payload.seller).session(session);
                if (!seller) {
                    throw new customError_1.default(404, 'Seller not found');
                }
                const product = yield this.model.findById(id).session(session);
                if (!product) {
                    throw new customError_1.default(404, 'Product not found');
                }
                if (payload.stock <= 0) {
                    throw new customError_1.default(400, 'Stock quantity must be greater than 0');
                }
                const updatedProduct = yield this.model.findByIdAndUpdate(id, { $inc: { stock: payload.stock } }, { new: true, session });
                yield purchase_model_1.default.create([{
                        user: userId,
                        seller: product.seller,
                        product: product._id,
                        sellerName: seller.name,
                        productName: product.name,
                        quantity: payload.stock,
                        unitPrice: product.price,
                        totalPrice: payload.stock * product.price,
                        measurement: product.measurement,
                    }], { session });
                yield session.commitTransaction();
                session.endSession();
                // Send notification for stock update
                yield this.sendProductNotification(updatedProduct, 'Stock Updated', `Stock increased by ${payload.stock} units`);
                yield this.checkAndNotifyStock(updatedProduct, payload.minStockAlert);
                return updatedProduct;
            }
            catch (error) {
                yield session.abortTransaction();
                session.endSession();
                if (error instanceof customError_1.default)
                    throw error;
                throw new customError_1.default(400, 'Add to stock failed');
            }
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const deletedProduct = yield this.model.findByIdAndDelete(id);
                if (!deletedProduct) {
                    throw new customError_1.default(404, 'Product not found');
                }
                // Send notification for product deletion
                yield this.sendProductNotification(deletedProduct, 'Deleted');
                return deletedProduct;
            }
            catch (error) {
                if (error instanceof customError_1.default)
                    throw error;
                throw new customError_1.default(400, 'Product delete failed');
            }
        });
    }
    // Include all other existing methods without changes
    readAllPublic() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            var _a;
            // Build the match stage with name functionality
            const matchStage = this.buildMatchStage(query);
            // Build the pipeline with the match stage and any additional stages
            const pipeline = this.buildPipeline(matchStage, query);
            // Fetch paginated data
            let data = yield this.model.aggregate(pipeline);
            // await this.sendProductNotification("welcome",'data');
            // Fetch the total count for pagination
            const totalCount = yield this.model.aggregate([
                matchStage,
                { $count: 'total' }
            ]);
            // Populate related fields for better readability
            data = yield this.model.populate(data, [
                { path: 'category', select: '-__v -user' },
                { path: 'brand', select: '-__v -user' },
                { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
            ]);
            return {
                data,
                totalCount: ((_a = totalCount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0
            };
        });
    }
    countTotalProduct(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pipeline = [
                    ...(userId ? [{ $match: { user: new mongoose_1.Types.ObjectId(userId) } }] : []),
                    {
                        $group: {
                            _id: null,
                            totalProducts: { $sum: 1 },
                            totalStock: { $sum: '$stock' },
                            totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
                        }
                    }
                ];
                const result = yield this.model.aggregate(pipeline);
                return result[0] || { totalProducts: 0, totalStock: 0, totalValue: 0 };
            }
            catch (error) {
                throw new customError_1.default(500, 'Failed to count total products');
            }
        });
    }
    readAll() {
        return __awaiter(this, arguments, void 0, function* (query = {}) {
            var _a;
            const matchStage = this.buildMatchStage(query);
            const pipeline = this.buildPipeline(matchStage, query);
            let data = yield this.model.aggregate(pipeline);
            const totalCount = yield this.model.aggregate([matchStage, { $count: 'total' }]);
            data = yield this.model.populate(data, [
                { path: 'category', select: '-__v -user' },
                { path: 'brand', select: '-__v -user' },
                { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
            ]);
            return {
                data,
                totalCount: ((_a = totalCount[0]) === null || _a === void 0 ? void 0 : _a.total) || 0
            };
        });
    }
    read(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const product = yield this.model.findOne({
                user: new mongoose_1.Types.ObjectId(userId),
                _id: id
            }).populate([
                { path: 'category', select: '-__v -user' },
                { path: 'brand', select: '-__v -user' },
                { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
            ]);
            if (!product) {
                throw new customError_1.default(404, 'Product not found');
            }
            return product;
        });
    }
    bulkDelete(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const objectIds = ids.map(id => new mongoose_1.Types.ObjectId(id));
                const result = yield this.model.deleteMany({ _id: { $in: objectIds } });
                return result;
            }
            catch (error) {
                throw new customError_1.default(400, 'Bulk delete failed');
            }
        });
    }
}
const productServices = new ProductServices(product_model_1.default, 'Product');
exports.default = productServices;
