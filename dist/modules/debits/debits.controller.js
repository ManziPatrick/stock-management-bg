"use strict";
// src/controllers/debit.controller.ts
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
exports.DebitController = void 0;
const debits_service_1 = require("./debits.service");
const catchAsync_1 = require("../utils/catchAsync");
// import { AppError } from '../utils/appError'; // Import AppError class
const debitService = new debits_service_1.DebitService();
class DebitController {
    constructor() {
        this.createDebit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const debit = yield debitService.createDebit(req.body);
            res.status(201).json({
                status: 'success',
                data: debit,
            });
        }));
        this.getAllDebits = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const result = yield debitService.getAllDebits(req.query);
            res.status(200).json(Object.assign({ status: 'success' }, result));
        }));
        this.getDebitById = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const debit = yield debitService.getDebitById(req.params.id);
            res.status(200).json({
                status: 'success',
                data: debit,
            });
        }));
        this.updateDebit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const debit = yield debitService.updateDebit(req.params.id, req.body);
            res.status(200).json({
                status: 'success',
                data: debit,
            });
        }));
        this.deleteDebit = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            yield debitService.deleteDebit(req.params.id);
            res.status(204).json({
                status: 'success',
                data: null,
            });
        }));
        this.getDebitSummary = (0, catchAsync_1.catchAsync)((req, res) => __awaiter(this, void 0, void 0, function* () {
            const summary = yield debitService.getDebitSummary();
            res.status(200).json({
                status: 'success',
                data: summary,
            });
        }));
    }
}
exports.DebitController = DebitController;
