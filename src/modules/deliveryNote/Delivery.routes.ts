// src/routes/DeliveryNote.routes.ts

import express from 'express';
import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import DeliveryNoteController from './Delivery.Controller';
import { verifyAuth } from '../../middlewares/verifyAuth';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Cloudinary with the correct environment variable names
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME, // Changed from CLOUDINARY_CLOUD_NAME
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET // Changed from CLOUDINARY_API_SECRET
});

// Use local storage initially - we'll handle Cloudinary upload in the controller
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `proof-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only .jpeg, .jpg, .png and .pdf files are allowed'));
    }
  }
});

// Middleware to check Cloudinary configuration
const checkCloudinaryConfig = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!process.env.CLOUDINARY_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_SECRET) {
    return res.status(500).json({ 
      success: false, 
      message: 'Cloudinary configuration is missing' 
    });
  }
  next();
};

// Routes with authentication middleware
router.post('/', verifyAuth, DeliveryNoteController.createDeliveryNote);
router.get('/', verifyAuth, DeliveryNoteController.getAllDeliveryNotes);
router.get('/:id', verifyAuth, DeliveryNoteController.getDeliveryNoteById);
router.patch('/:id', verifyAuth, DeliveryNoteController.updateDeliveryNote);
router.delete('/:id', verifyAuth, DeliveryNoteController.deleteDeliveryNote);

// Route for uploading proof of delivery
router.post(
  '/:id/proof',
  verifyAuth,
  checkCloudinaryConfig, // Check Cloudinary config before proceeding
  upload.single('proof'),
  DeliveryNoteController.uploadProofOfDelivery
);

export default router;