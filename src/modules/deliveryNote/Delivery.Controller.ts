// src/controllers/DeliveryNote.controller.ts

import { Request, Response, NextFunction } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import DeliveryNoteService from './Delivery.service';
import CustomError from '../utils/customError';

class DeliveryNoteController {
  /**
   * Create a new delivery note
   */
  async createDeliveryNote(req: Request, res: Response, next: NextFunction) {
    try {
      const deliveryNoteData = req.body;
      const deliveryNote = await DeliveryNoteService.createDeliveryNote(deliveryNoteData);
      
      res.status(201).json({
        success: true,
        message: 'Delivery note created successfully',
        data: deliveryNote
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all delivery notes with pagination and filtering
   */
  async getAllDeliveryNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query;
      const result = await DeliveryNoteService.getAllDeliveryNotes(query);
      
      res.status(200).json({
        success: true,
        message: 'Delivery notes fetched successfully',
        data: result.data,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get delivery note by ID
   */
  async getDeliveryNoteById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const deliveryNote = await DeliveryNoteService.getDeliveryNoteById(id);
      
      res.status(200).json({
        success: true,
        message: 'Delivery note fetched successfully',
        data: deliveryNote
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update delivery note by ID
   */
  async updateDeliveryNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedDeliveryNote = await DeliveryNoteService.updateDeliveryNote(id, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Delivery note updated successfully',
        data: updatedDeliveryNote
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete delivery note by ID
   */
  async deleteDeliveryNote(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await DeliveryNoteService.deleteDeliveryNote(id);
      
      res.status(200).json({
        success: true,
        message: 'Delivery note deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload proof of delivery
   */
  async uploadProofOfDelivery(req: Request, res: Response, next: NextFunction) {
    let localFilePath = '';
    
    try {
      const { id } = req.params;
      
      // Check if file exists in the request
      if (!req.file) {
        throw new CustomError(400, 'No file uploaded');
      }
      
      localFilePath = req.file.path;
      
      // Upload to Cloudinary using the configuration from routes file
      const cloudinaryResult = await cloudinary.uploader.upload(localFilePath, {
        folder: 'delivery-proofs',
        resource_type: 'auto'
      });
      
      if (!cloudinaryResult || !cloudinaryResult.secure_url) {
        throw new CustomError(500, 'Failed to upload to Cloudinary');
      }
      
      // Update delivery note with the proof URL
      const updatedDeliveryNote = await DeliveryNoteService.updateProofOfDelivery(
        id, 
        cloudinaryResult.secure_url
      );
      
      // Clean up the local file after successful upload
      fs.unlinkSync(localFilePath);
      localFilePath = '';
      
      res.status(200).json({
        success: true,
        message: 'Proof of delivery uploaded successfully',
        data: {
          proofOfDeliveryUrl: cloudinaryResult.secure_url,
          deliveryNote: updatedDeliveryNote
        }
      });
    } catch (error) {
      console.error('Error in uploadProofOfDelivery:', error);
      
      // Clean up local file if it exists and an error occurred
      if (localFilePath) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
          console.error('Failed to clean up uploaded file:', unlinkError);
        }
      }
      
      if (error instanceof CustomError) {
        next(error);
      } else {
        next(new CustomError(500, `Error uploading proof: ${(error as Error).message}`));
      }
    }
  }

}

export default new DeliveryNoteController();