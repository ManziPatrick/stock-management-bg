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
const sale_services_1 = __importDefault(require("./sale.services"));
class SaleControllers {
    create(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.create(req.body, user._id);
                res.status(201).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readAll(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.readAll(req.query);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readSingle(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield sale_services_1.default.readById(id);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                const result = yield sale_services_1.default.update(id, req.body);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    delete(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { id } = req.params;
                yield sale_services_1.default.delete(id);
                res.status(200).json({ success: true, message: 'Sale deleted successfully' });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readAllDaily(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.readAllDaily(user._id);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readAllWeekly(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.readAllWeekly(user._id);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readAllMonthly(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.readAllMonthly(user._id);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
    readAllYearly(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { user } = req;
                const result = yield sale_services_1.default.readAllYearly(user._id);
                res.status(200).json({ success: true, data: result });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.default = new SaleControllers();
