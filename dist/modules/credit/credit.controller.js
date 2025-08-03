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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditController = void 0;
const credit_service_1 = require("./credit.service");
const catchAsync_1 = require("../utils/catchAsync");
class CreditController {
    constructor() {
        this.createCredit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const credit = yield this.creditService.createCredit(req.body, req.user._id);
            res.status(201).json({
                status: 'success',
                data: credit,
            });
        }));
        this.getAllCredits = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield this.creditService.getAllCredits(req.query);
            res.status(200).json(Object.assign({ status: 'success' }, result));
        }));
        this.getCreditById = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const credit = yield this.creditService.getCreditById(req.params.id);
            res.status(200).json({
                status: 'success',
                data: credit,
            });
        }));
        this.updateCredit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const credit = yield this.creditService.updateCredit(req.params.id, req.body);
            res.status(200).json({
                status: 'success',
                data: credit,
            });
        }));
        this.deleteCredit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield this.creditService.deleteCredit(req.params.id);
            res.status(204).json({
                status: 'success',
                data: null,
            });
        }));
        this.getCreditSummary = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const summary = yield this.creditService.getCreditSummary();
            res.status(200).json({
                status: 'success',
                data: summary,
            });
        }));
        this.makePayment = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const credit = yield this.creditService.makePayment(req.params.id, req.body);
            res.status(200).json({
                status: 'success',
                data: credit,
            });
        }));
        this.verifyDelivery = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const credit = yield this.creditService.verifyDelivery(req.body, req.user._id);
            res.status(200).json({
                status: 'success',
                data: credit,
            });
        }));
        this.getStockSummary = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const summary = yield this.creditService.getStockSummary(req.params.productId);
            res.status(200).json({
                status: 'success',
                data: summary,
            });
        }));
        this.getPendingDeliveries = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            // For non-admin users, filter by their own created credits
            const userId = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' ? undefined : req.user._id;
            const deliveries = yield this.creditService.getPendingDeliveries(userId);
            res.status(200).json({
                status: 'success',
                data: deliveries,
            });
        }));
        this.creditService = new credit_service_1.CreditService();
    }
}
exports.CreditController = CreditController;
