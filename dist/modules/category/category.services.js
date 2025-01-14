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
const baseServices_1 = __importDefault(require("../baseServices"));
const category_model_1 = __importDefault(require("./category.model"));
class CategoryServices extends baseServices_1.default {
    constructor(model, modelName) {
        super(model, modelName);
    }
    /**
     * Read all category of user
     */
    getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.model.find(); // No filtering by userId
        });
    }
}
const categoryServices = new CategoryServices(category_model_1.default, 'Category');
exports.default = categoryServices;
