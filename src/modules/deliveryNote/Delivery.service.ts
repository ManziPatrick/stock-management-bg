// src/services/DeliveryNote.service.ts

import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';
import DeliveryNote from './Delivery.models';
import { IDeliveryNote, IDeliveryNoteCreate, IDeliveryNoteQuery, IDeliveryNoteUpdate } from './Delivery.interface';
import CustomError from '../utils/customError';

class DeliveryNoteService {
  /**
   * Create a new delivery note
   */
  async createDeliveryNote(deliveryNoteData: IDeliveryNoteCreate): Promise<IDeliveryNote> {
    try {
      // Generate unique ID for the delivery note if not provided
      if (!deliveryNoteData.id) {
        deliveryNoteData.id = `DN-${uuidv4().substring(0, 8).toUpperCase()}`;
      }
      
      const deliveryNote = await DeliveryNote.create(deliveryNoteData);
      return deliveryNote.toJSON();
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        throw new CustomError(400, `Validation Error: ${error.message}`);
      }
      throw new CustomError(500, `Error creating delivery note: ${(error as Error).message}`);
    }
  }

  /**
   * Get all delivery notes with pagination and filtering
   */
  async getAllDeliveryNotes(query: IDeliveryNoteQuery): Promise<{ 
    data: IDeliveryNote[], 
    total: number, 
    page: number, 
    limit: number 
  }> {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      customerName,
      startDate,
      endDate,
      status
    } = query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    // Build filter object
    let filter: any = {};
    
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }
    
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate as string), $lte: new Date(endDate as string) };
    } else if (startDate) {
      filter.date = { $gte: new Date(startDate as string) };
    } else if (endDate) {
      filter.date = { $lte: new Date(endDate as string) };
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;
    
    try {
      const [deliveryNotes, total] = await Promise.all([
        DeliveryNote.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .exec(),
        DeliveryNote.countDocuments(filter)
      ]);
      
      return {
        data: deliveryNotes.map(note => note.toJSON()),
        total,
        page: Number(page),
        limit: Number(limit)
      };
    } catch (error) {
      throw new CustomError(500, `Error fetching delivery notes: ${(error as Error).message}`);
    }
  }

  /**
   * Get delivery note by ID
   */
  async getDeliveryNoteById(id: string): Promise<IDeliveryNote> {
    try {
      const deliveryNote = await DeliveryNote.findOne({ id }).exec();
      
      if (!deliveryNote) {
        throw new CustomError(404, `Delivery note with ID ${id} not found`);
      }
      
      return deliveryNote.toJSON();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, `Error fetching delivery note with ID ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Update delivery note by ID
   */
  async updateDeliveryNote(id: string, updateData: IDeliveryNoteUpdate): Promise<IDeliveryNote> {
    try {
      const deliveryNote = await DeliveryNote.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true, runValidators: true }
      ).exec();
      
      if (!deliveryNote) {
        throw new CustomError(404, `Delivery note with ID ${id} not found`);
      }
      
      return deliveryNote.toJSON();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      if (error instanceof mongoose.Error.ValidationError) {
        throw new CustomError(400, `Validation Error: ${error.message}`);
      }
      throw new CustomError(500, `Error updating delivery note with ID ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Delete delivery note by ID
   */
  async deleteDeliveryNote(id: string): Promise<void> {
    try {
      // Check if the delivery note has a proof of delivery URL
      const deliveryNote = await DeliveryNote.findOne({ id }).exec();
      
      if (!deliveryNote) {
        throw new CustomError(404, `Delivery note with ID ${id} not found`);
      }
      
      // If there's a proof of delivery image in Cloudinary, delete it
      if (deliveryNote.proofOfDeliveryUrl) {
        try {
          // Extract public_id from URL
          const publicId = this.getPublicIdFromUrl(deliveryNote.proofOfDeliveryUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (cloudinaryError) {
          console.error('Failed to delete image from Cloudinary:', cloudinaryError);
          // Continue with deletion even if Cloudinary delete fails
        }
      }
      
      // Delete the delivery note document
      await DeliveryNote.findOneAndDelete({ id }).exec();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, `Error deleting delivery note with ID ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Update proof of delivery
   */
  async updateProofOfDelivery(id: string, proofOfDeliveryUrl: string): Promise<IDeliveryNote> {
    try {
      // Check if delivery note exists
      const existingNote = await DeliveryNote.findOne({ id }).exec();
      
      if (!existingNote) {
        throw new CustomError(404, `Delivery note with ID ${id} not found`);
      }
      
      // If there's an existing proof of delivery image, delete it from Cloudinary
      if (existingNote.proofOfDeliveryUrl) {
        try {
          // Extract public_id from URL
          const publicId = this.getPublicIdFromUrl(existingNote.proofOfDeliveryUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (cloudinaryError) {
          console.error('Failed to delete previous image from Cloudinary:', cloudinaryError);
          // Continue with update even if Cloudinary delete fails
        }
      }
      
      // Update the delivery note with the new proof URL
      const deliveryNote = await DeliveryNote.findOneAndUpdate(
        { id },
        { 
          $set: { 
            proofOfDeliveryUrl,
            status: 'delivered', // Update status to delivered when proof is uploaded
            deliveredAt: new Date() // Record delivery timestamp
          } 
        },
        { new: true }
      ).exec();
      
      if (!deliveryNote) {
        throw new CustomError(404, `Delivery note with ID ${id} not found`);
      }
      
      return deliveryNote.toJSON();
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(500, `Error updating proof of delivery for note with ID ${id}: ${(error as Error).message}`);
    }
  }

  /**
   * Helper method to extract public_id from Cloudinary URL
   */
  private getPublicIdFromUrl(url: string): string | null {
    // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/delivery-proofs/abcdefgh.jpg
    try {
      const urlParts = url.split('/');
      // Get the folder and filename (excluding the file extension)
      const filenameParts = urlParts[urlParts.length - 1].split('.');
      const folderName = urlParts[urlParts.length - 2];
      const filename = filenameParts[0];
      return `${folderName}/${filename}`;
    } catch (error) {
      console.error('Error parsing Cloudinary URL:', error);
      return null;
    }
  }
}

export default new DeliveryNoteService();