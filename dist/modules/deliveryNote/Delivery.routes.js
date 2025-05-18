"use strict";
// src/routes/DeliveryNote.routes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("cloudinary");
const Delivery_Controller_1 = __importDefault(require("./Delivery.Controller"));
const verifyAuth_1 = require("../../middlewares/verifyAuth");
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure Cloudinary with the correct environment variable names
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME, // Changed from CLOUDINARY_CLOUD_NAME
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET // Changed from CLOUDINARY_API_SECRET
});
// Use local storage initially - we'll handle Cloudinary upload in the controller
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `proof-${Date.now()}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only .jpeg, .jpg, .png and .pdf files are allowed'));
        }
    }
});
// Middleware to check Cloudinary configuration
const checkCloudinaryConfig = (req, res, next) => {
    if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_SECRET) {
        return res.status(500).json({
            success: false,
            message: 'Cloudinary configuration is missing'
        });
    }
    next();
};
// Routes with authentication middleware
router.post('/', verifyAuth_1.verifyAuth, Delivery_Controller_1.default.createDeliveryNote);
router.get('/', verifyAuth_1.verifyAuth, Delivery_Controller_1.default.getAllDeliveryNotes);
router.get('/:id', verifyAuth_1.verifyAuth, Delivery_Controller_1.default.getDeliveryNoteById);
router.patch('/:id', verifyAuth_1.verifyAuth, Delivery_Controller_1.default.updateDeliveryNote);
router.delete('/:id', verifyAuth_1.verifyAuth, Delivery_Controller_1.default.deleteDeliveryNote);
// Route for uploading proof of delivery
router.post('/:id/proof', verifyAuth_1.verifyAuth, checkCloudinaryConfig, // Check Cloudinary config before proceeding
upload.single('proof'), Delivery_Controller_1.default.uploadProofOfDelivery);
exports.default = router;
