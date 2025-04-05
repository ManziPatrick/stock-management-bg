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
exports.ProformaService = void 0;
const proforma_model_1 = __importDefault(require("./proforma.model"));
const uuid_1 = require("uuid");
class ProformaService {
    generateInvoiceNumber() {
        return `INV${new Date().getFullYear()}${(new Date().getMonth() + 1)
            .toString()
            .padStart(2, '0')}-${(0, uuid_1.v4)().slice(0, 8).toUpperCase()}`;
    }
    createProforma(proformaData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const invoiceNo = this.generateInvoiceNumber();
                // Prepare the proforma data with generated invoice number
                const preparedData = Object.assign(Object.assign({}, proformaData), { invoiceNumber: invoiceNo, date: new Date(), status: 'draft', invoiceDetails: {
                        invoiceNo: invoiceNo,
                        invoiceDate: new Date()
                    } });
                const proforma = new proforma_model_1.default(preparedData);
                yield proforma.save();
                return proforma;
            }
            catch (error) {
                throw error;
            }
        });
    }
    getAllProformas(queryParams) {
        return __awaiter(this, void 0, void 0, function* () {
            const { page = 1, limit = 10, status, search, startDate, endDate } = queryParams;
            const query = {};
            if (status) {
                query.status = status;
            }
            if (search) {
                query.$or = [
                    { clientName: { $regex: search, $options: 'i' } },
                    { invoiceNumber: { $regex: search, $options: 'i' } },
                    { 'invoiceDetails.invoiceNo': { $regex: search, $options: 'i' } }
                ];
            }
            if (startDate && endDate) {
                query.date = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                };
            }
            const skip = (page - 1) * limit;
            const [proformas, total] = yield Promise.all([
                proforma_model_1.default.find(query)
                    .populate({
                    path: 'items.product',
                    select: 'name price'
                })
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                proforma_model_1.default.countDocuments(query),
            ]);
            const totalPages = Math.ceil(total / limit);
            return {
                data: proformas,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: total,
                    hasNextPage: page < totalPages,
                    hasPrevPage: page > 1,
                },
            };
        });
    }
    findById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const proforma = yield proforma_model_1.default.findById(id).populate('items.product');
            if (!proforma)
                throw new Error('Proforma not found');
            return proforma;
        });
    }
    updateStatus(id, status) {
        return __awaiter(this, void 0, void 0, function* () {
            const proforma = yield proforma_model_1.default.findById(id);
            if (!proforma)
                throw new Error('Proforma not found');
            proforma.status = status;
            return proforma.save();
        });
    }
    update(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const proforma = yield proforma_model_1.default.findById(id);
                if (!proforma) {
                    throw new Error('Proforma not found');
                }
                // Don't allow modification of invoice number
                if (updateData.invoiceNumber || ((_a = updateData.invoiceDetails) === null || _a === void 0 ? void 0 : _a.invoiceNo)) {
                    throw new Error('Invoice number cannot be modified');
                }
                // Update the proforma
                Object.assign(proforma, updateData);
                yield proforma.save();
                return proforma;
            }
            catch (error) {
                throw error;
            }
        });
    }
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const proforma = yield proforma_model_1.default.findById(id);
                if (!proforma)
                    throw new Error('Proforma not found');
                if (proforma.status !== 'draft')
                    throw new Error('Only draft Proformas can be deleted');
                yield proforma.deleteOne();
            }
            catch (error) {
                throw error;
            }
        });
    }
}
exports.ProformaService = ProformaService;
