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
/* eslint-disable @typescript-eslint/no-explicit-any */
const mongoose_1 = require("mongoose");
const customError_1 = __importDefault(require("../errors/customError"));
const http_status_1 = __importDefault(require("http-status"));
class BaseServices {
    constructor(model, modelName) {
        this.modelName = '';
        if (!model || !(model.prototype instanceof mongoose_1.Model)) {
            throw new Error('Invalid Mongoose model!');
        }
        this.model = model;
        this.modelName = modelName;
    }
    /**
     * Create new
     */
    create(payload, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            payload.user = userId;
            return this.model.create(payload);
        });
    }
    /**
     * Update
     */
    update(id, payload) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._isExists(id);
            return this.model.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
        });
    }
    /**
     * Delete
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this._isExists(id);
            return this.model.findByIdAndDelete(id);
        });
    }
    _isExists(id) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(yield this.model.findById(id))) {
                throw new customError_1.default(http_status_1.default.NOT_FOUND, this.modelName + ' is not found!');
            }
        });
    }
}
exports.default = BaseServices;
