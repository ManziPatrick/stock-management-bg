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
const express_1 = require("express");
const validateRequest_1 = __importDefault(require("../../middlewares/validateRequest"));
const product_validator_1 = __importDefault(require("./product.validator"));
const product_controllers_1 = __importDefault(require("./product.controllers"));
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const cloudinaryConfig_1 = require("../image/cloudinaryConfig");
const productRoute = (0, express_1.Router)();
productRoute.get('/', product_controllers_1.default.readAllPublic);
//the file path where you had written this functions in earlier
productRoute.post("/upload", cloudinaryConfig_1.upload.array('images', 5), cloudinaryConfig_1.uploadToCloudinary, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const cloudinaryUrls = req.body.cloudinaryUrls;
        if (cloudinaryUrls.length === 0) {
            console.error('No Cloudinary URLs found.');
            return res.status(500).send('Internal Server Error');
        }
        const images = cloudinaryUrls;
        return res.send(images);
    }
    catch (error) {
        return res.status(500).json({ error });
    }
}));
productRoute.use(verifyAuth_1.verifyAuth);
productRoute.get('/total', product_controllers_1.default.getTotalProduct);
productRoute.post('/bulk-delete', product_controllers_1.default.bulkDelete);
productRoute.post('/', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), product_controllers_1.default.create);
// productRoute.get('/', productControllers.readAll);
productRoute.patch('/:id/add', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(product_validator_1.default.addStockSchema), product_controllers_1.default.addStock);
productRoute.patch('/:id', (0, verifyAuth_1.authorizeRoles)('KEEPER', 'ADMIN'), (0, validateRequest_1.default)(product_validator_1.default.updateSchema), product_controllers_1.default.update);
productRoute.get('/:id', product_controllers_1.default.readSingle);
productRoute.delete('/:id', (0, verifyAuth_1.authorizeRoles)('ADMIN'), product_controllers_1.default.delete);
exports.default = productRoute;
