//@ts-nocheck

import mongoose, { Types } from 'mongoose';
import BaseServices from '../baseServices';
import Product from './product.model';
import Purchase from '../purchase/purchase.model';
import User from '../user/user.model';
import nodemailer from 'nodemailer';
import Seller from '../seller/seller.model';
import CustomError from '../../errors/customError';
import { IProduct, IMeasurement } from './product.interface';

interface StockUpdate {
  seller: string;
  stock: number;
  minStockAlert?: number; 
}

interface ProductCreateResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data?: IProduct;
}

type QueryOptions = {
  name?: string;
  category?: string;
  brand?: string;
  seller?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: string | number;
  limit?: string | number;
};

class ProductServices extends BaseServices<any> {
  private transporter: nodemailer.Transporter;

  constructor(model: any, modelName: string) {
    super(model, modelName);
    this.transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Build the query conditions based on query parameters.
   * (Note: Do NOT wrap these conditions in a $match operator)
   */
  private buildMatchStage(query: QueryOptions, userId?: string) {
    return {
      ...(userId && { user: new Types.ObjectId(userId) }),
      ...(query.name && {
        $or: [
          { name: { $regex: query.name, $options: 'i' } },
          { description: { $regex: query.name, $options: 'i' } }
        ]
      }),
      ...(query.category && { category: new Types.ObjectId(query.category) }),
      ...(query.brand && { brand: new Types.ObjectId(query.brand) }),
      ...(query.seller && { seller: new Types.ObjectId(query.seller) }),
      ...(query.minPrice && { price: { $gte: Number(query.minPrice) } }),
      ...(query.maxPrice && { price: { $lte: Number(query.maxPrice) } })
    };
  }

  /**
   * Build the aggregation pipeline.
   */
  private buildPipeline(matchStage: any, query: QueryOptions) {
    return [
      { $match: matchStage },
      {
        $sort: {
          [query.sortBy || 'createdAt']: query.sortOrder === 'asc' ? 1 : -1
        }
      },
      {
        $skip: (Number(query.page || 1) - 1) * Number(query.limit || 10)
      },
      {
        $limit: Number(query.limit || 10)
      }
    ];
  }

  /**
   * Ensure the pipeline is always an array.
   */
  private ensurePipelineIsArray(pipeline: any): any[] {
    return Array.isArray(pipeline) ? pipeline : [pipeline];
  }

  private async getAdminAndKeeperEmails(): Promise<string[]> {
    const users = await User.find({
      role: { $in: ['ADMIN', 'KEEPER'] },
      status: 'ACTIVE'
    });
    const emails = users.map(user => user.email);
    console.log('Found admin and keeper emails:', emails);
    return emails;
  }
  
  private async sendProductNotification(product: IProduct, action: string, details?: string): Promise<void> {
    try {
      console.log('Starting product notification for:', product.name);
      const recipients = await this.getAdminAndKeeperEmails();
      console.log('Recipients for product notification:', recipients);
      
      // Format measurement info if available
      let measurementInfo = '';
      if (product.measurement) {
        measurementInfo = `
          <p><strong>Measurement Information:</strong></p>
          <p>Type: ${product.measurement.type}</p>
          <p>Unit: ${product.measurement.unit}</p>
          ${product.measurement.value !== undefined ? `<p>Value: ${product.measurement.value}</p>` : ''}
        `;
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients.join(', '),
        subject: `Product ${action}: ${product.name}`,
        html: `
          <h2>Product ${action} Notification</h2>
          <p>Product: ${product.name}</p>
          <p>Action: ${action}</p>
          ${details ? `<p>${details}</p>` : ''}
          <p>Current Stock: ${product.stock}</p>
          <p>Price: ${product.price}</p>
          <p>Category: ${product.category}</p>
          ${measurementInfo}
          <p>Time: ${new Date().toLocaleString()}</p>
        `
      };
  
      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
  
      await this.transporter.sendMail(mailOptions);
      console.log('Product notification sent successfully');
    } catch (error) {
      console.error('Error in sendProductNotification:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
  
  private async sendStockNotification(product: IProduct, seller: any): Promise<void> {
    try {
      console.log('Starting stock notification for:', product.name);
      const recipients = await this.getAdminAndKeeperEmails();
      recipients.push(seller.email);
      console.log('Recipients for stock notification:', recipients);
  
      const stockStatus = product.stock === 0 ? 'Out of Stock' : 'Low Stock';
      
      // Format measurement info if available
      let measurementInfo = '';
      if (product.measurement) {
        measurementInfo = `
          <p>Measurement Type: ${product.measurement.type}</p>
          <p>Measurement Unit: ${product.measurement.unit}</p>
          ${product.measurement.value !== undefined ? `<p>Measurement Value: ${product.measurement.value}</p>` : ''}
        `;
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: recipients.join(', '),
        subject: `${stockStatus} Alert: ${product.name}`,
        html: `
          <h2>${stockStatus} Alert</h2>
          <p>Product: ${product.name}</p>
          <p>Current Stock: ${product.stock}</p>
          <p>Status: ${stockStatus}</p>
          <p>Seller: ${seller.name}</p>
          ${measurementInfo}
          ${product.stock === 0 
            ? '<p style="color: red;"><strong>URGENT: Product is out of stock!</strong></p>'
            : '<p style="color: orange;"><strong>Warning: Stock level is low!</strong></p>'
          }
          <p>Please update your inventory soon.</p>
        `
      };
  
      console.log('Sending stock notification email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
  
      await this.transporter.sendMail(mailOptions);
      console.log('Stock notification sent successfully');
    } catch (error) {
      console.error('Error in sendStockNotification:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
  
  private async checkAndNotifyStock(product: IProduct, minStockAlert?: number): Promise<void> {
    const stockThreshold = minStockAlert ?? 5; // Default threshold is 5
    console.log('Checking stock for product:', product.name, 'Current stock:', product.stock, 'Threshold:', stockThreshold);
    
    if (product.stock <= stockThreshold) {
      console.log('Low stock detected, fetching seller information');
      const seller = await Seller.findById(product.seller);
      if (seller) {
        console.log('Seller found:', seller.name);
        await this.sendStockNotification(product, seller);
      } else {
        console.log('Seller not found for product:', product.name);
      }
    }
  }
  
  private validateMeasurement(measurement: any): boolean {
    // If measurement doesn't exist, it's valid (since it's optional)
    if (!measurement) return true;
    
    // First, fix the structure if needed
    let measurementToValidate = measurement;
    
    // Handle case where the property is named 'measurement' instead of 'type'
    if (measurement.measurement && !measurement.type) {
      measurementToValidate = {
        type: measurement.measurement,
        unit: measurement.unit,
        value: measurement.value
      };
    }
    
    // Basic validation to ensure required fields are present
    const isValid = (
      typeof measurementToValidate.type === 'string' && 
      measurementToValidate.type.length > 0 &&
      typeof measurementToValidate.unit === 'string' && 
      measurementToValidate.unit.length > 0 &&
      (measurementToValidate.value === undefined || typeof measurementToValidate.value === 'number')
    );
    
    console.log('Measurement validation result:', isValid, 'for:', measurementToValidate);
    return isValid;
  }

  
  private async getAccessibleUserIds(currentUserId: string): Promise<Types.ObjectId[]> {
    if (!currentUserId || !Types.ObjectId.isValid(currentUserId)) {
      console.log('[getAccessibleUserIds] Invalid or missing user ID:', currentUserId);
      return [];
    }
  
    try {
      console.log(`[getAccessibleUserIds] Fetching accessible user IDs for: ${currentUserId}`);
  
      // Fetch current user
      const currentUser = await User.findById(currentUserId).lean();
      
      if (!currentUser) {
        console.log(`[getAccessibleUserIds] User not found: ${currentUserId}`);
        return [new Types.ObjectId(currentUserId)];
      }
  
      // Start with current user's ID
      const accessibleIds: Types.ObjectId[] = [new Types.ObjectId(currentUserId)];
      console.log(`[getAccessibleUserIds] User found. Role: ${currentUser.role}`);
  
      // If user was created by another user, add that creator's ID
      if (currentUser.createdBy) {
        console.log(`[getAccessibleUserIds] Adding creator ID: ${currentUser.createdBy}`);
        accessibleIds.push(new Types.ObjectId(currentUser.createdBy));
      }
  
      // Fetch all users created by the current user
      const createdUsers = await User.find({ createdBy: currentUserId }).select('_id').lean();
      
      if (createdUsers.length > 0) {
        const createdUserIds = createdUsers.map(user => new Types.ObjectId(user._id));
        console.log(`[getAccessibleUserIds] Found ${createdUsers.length} users created by ${currentUserId}`);
        accessibleIds.push(...createdUserIds);
      } else {
        console.log(`[getAccessibleUserIds] No users created by ${currentUserId}`);
      }
  
      console.log(`[getAccessibleUserIds] Total accessible user IDs: ${accessibleIds.length}`);
      return accessibleIds;
    } catch (error) {
      console.error('[getAccessibleUserIds] Error:', error);
      return [new Types.ObjectId(currentUserId)]; // Return just the current user's ID in case of error
    }
  }

  async create(payload: Partial<IProduct>, userId: string): Promise<ProductCreateResponse> {
    try {
      // Log incoming payload for debugging
      console.log('Creating product with payload:', payload);
      
      // Fix measurement structure if needed
      if (payload.measurement && payload.measurement['measurement'] && !payload.measurement['type']) {
        payload.measurement = {
          type: payload.measurement['measurement'],
          unit: payload.measurement['unit'],
          value: payload.measurement['value']
        };
      }
  
      const productData = {
        ...payload,
        user: new Types.ObjectId(userId),
        seller: new Types.ObjectId(payload.seller),
        category: new Types.ObjectId(payload.category),
        createdBy: new Types.ObjectId(userId), // Set createdBy to the current user
        ...(payload.brand && { brand: new Types.ObjectId(payload.brand) }),
        stock: Number(payload.stock),
      };
      console.log('Product data to create:', productData);
  
      // Check seller existence
      const seller = await Seller.findById(payload.seller);
      if (!seller) {
        throw new CustomError(404, 'Seller not found');
      }
  
      // Validate measurement if provided
      if (payload.measurement && !this.validateMeasurement(payload.measurement)) {
        console.log('Measurement validation failed for:', payload.measurement);
        throw new CustomError(400, 'Invalid measurement data');
      }
  
      // Create product without a session/transaction
      const product = await this.model.create(productData);
      console.log('Product created:', product);
  
      // Create purchase record
      await Purchase.create({
        user: userId,
        seller: product.seller,
        product: product._id,
        sellerName: seller.name,
        productName: product.name,
        quantity: product.stock,
        unitPrice: product.price,
        totalPrice: product.stock * product.price,
        measurement: product.measurement,
      });
  
      await this.sendProductNotification(product, 'Created');
      await this.checkAndNotifyStock(product);
  
      return {
        success: true,
        statusCode: 201,
        message: 'Product created successfully',
        data: product
      };
    } catch (error: any) {
      console.error('Error creating product:', error);
      if (error.name === 'ValidationError') {
        throw new CustomError(400, Object.values(error.errors).map((err: any) => err.message).join(', '));
      }
      if (error.code === 11000) {
        throw new CustomError(400, 'Duplicate product entry');
      }
      throw error instanceof CustomError ? error : new CustomError(500, 'Failed to create product');
    }
  }
  
 
  async update(id: string, payload: Partial<IProduct>, options?: { updatePurchases?: boolean, userId?: string }) {
    try {
      console.log("🚀 Updating product:", id);
      console.log("🔄 Update Purchases Flag:", options?.updatePurchases);
      console.log("📦 Payload received:", payload);
  
      // Fix measurement structure if needed
      if (payload.measurement && payload.measurement['measurement'] && !payload.measurement['type']) {
        payload.measurement = {
          type: payload.measurement['measurement'],
          unit: payload.measurement['unit'],
          value: payload.measurement['value']
        };
      }
  
      if (payload.measurement && !this.validateMeasurement(payload.measurement)) {
        console.log('Measurement validation failed for:', payload.measurement);
        throw new CustomError(400, 'Invalid measurement data');
      }
  
      // Update the product without using transactions
      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        {
          ...payload,
          ...(payload.seller && { seller: new Types.ObjectId(payload.seller) }),
          ...(payload.category && { category: new Types.ObjectId(payload.category) }),
          ...(payload.brand && { brand: new Types.ObjectId(payload.brand) })
        },
        { new: true }
      ).populate(['category', 'brand', 'seller']);
  
      if (!updatedProduct) {
        throw new CustomError(404, 'Product not found');
      }
  
      console.log("✅ Product updated successfully:", updatedProduct);
  
      // --- Update Purchase Records if Flag is True ---
      if (options?.updatePurchases) {
        console.log("📢 Updating purchase records...");
        const purchases = await Purchase.find({
          product: id,
          stockAddition: { $ne: true }
        });
  
        console.log("🛒 Purchases found:", purchases.length);
  
        for (const purchase of purchases) {
          const updates: any = {};
  
          if (payload.price && payload.price !== purchase.unitPrice) {
            updates.unitPrice = payload.price;
            updates.totalPrice = payload.price * purchase.quantity;
          }
  
          if (payload.measurement && JSON.stringify(payload.measurement) !== JSON.stringify(purchase.measurement)) {
            // Ensure measurement is in the correct format
            const normalizedMeasurement = payload.measurement['measurement'] && !payload.measurement['type'] 
              ? {
                  type: payload.measurement['measurement'],
                  unit: payload.measurement['unit'],
                  value: payload.measurement['value']
                }
              : payload.measurement;
              
            updates.measurement = normalizedMeasurement;
          }
  
          if (Object.keys(updates).length > 0) {
            console.log(`🔄 Updating purchase ${purchase._id} with:`, updates);
            try {
              await Purchase.findByIdAndUpdate(
                purchase._id, 
                updates, 
                { session: undefined } // explicitly set session to undefined
              );
            } catch (purchaseError) {
              console.error(`❌ Error updating purchase ${purchase._id}:`, purchaseError);
              // Continue with other purchases even if one fails
            }
          } else {
            console.log(`⚠️ No changes needed for purchase ${purchase._id}`);
          }
        }
      } else {
        console.log("⚠️ Purchases not updated. Flag not set.");
      }
  
      await this.sendProductNotification(updatedProduct, 'Updated');
      await this.checkAndNotifyStock(updatedProduct);
  
      return {
        success: true,
        statusCode: 200,
        message: 'Product updated successfully',
        data: updatedProduct
      };
  
    } catch (error) {
      console.error("❌ Error updating product:", error);
      if (error instanceof CustomError) throw error;
      
      if (error.name === 'ValidationError') {
        throw new CustomError(400, Object.values(error.errors).map((err: any) => err.message).join(', '));
      }
      if (error.code === 11000) {
        throw new CustomError(400, 'Duplicate product entry');
      }
      
      throw new CustomError(500, `Failed to update product: ${error.message}`);
    }
  }

async update(id: string, payload: Partial<IProduct>, options?: { updatePurchases?: boolean, userId?: string }) {
  try {
    console.log("🚀 Updating product:", id);
    console.log("🔄 Update Purchases Flag:", options?.updatePurchases);
    console.log("📦 Payload received:", payload);

    if (payload.measurement && !this.validateMeasurement(payload.measurement)) {
      throw new CustomError(400, 'Invalid measurement data');
    }

    // First check if product exists
    const productExists = await this.model.findById(id);
    if (!productExists) {
      throw new CustomError(404, 'Product not found');
    }

    // Update the product without using transactions
    const updatedProduct = await this.model.findByIdAndUpdate(
      id,
      {
        ...payload,
        ...(payload.seller && { seller: new Types.ObjectId(payload.seller) }),
        ...(payload.category && { category: new Types.ObjectId(payload.category) }),
        ...(payload.brand && { brand: new Types.ObjectId(payload.brand) })
      },
      { new: true }
    ).populate(['category', 'brand', 'seller']);

    console.log("✅ Product updated successfully:", updatedProduct);

    // --- Update Purchase Records if Flag is True ---
    if (options?.updatePurchases) {
      console.log("🔄 Searching for purchases with productId:", id);
      const purchases = await Purchase.find({
        product: id,
        stockAddition: { $ne: true }
      });

      console.log("🛒 Purchases found:", purchases.length);

      for (const purchase of purchases) {
        const updates: any = {};

        if (payload.price && payload.price !== purchase.unitPrice) {
          updates.unitPrice = payload.price;
          updates.totalPrice = payload.price * purchase.quantity;
        }

        if (payload.measurement && JSON.stringify(payload.measurement) !== JSON.stringify(purchase.measurement)) {
          updates.measurement = payload.measurement;
        }

        if (Object.keys(updates).length > 0) {
          console.log(`🔄 Updating purchase ${purchase._id} with:`, updates);
          try {
            await Purchase.findByIdAndUpdate(
              purchase._id, 
              updates, 
              { new: true } // Remove session completely
            );
          } catch (purchaseError) {
            console.error(`❌ Error updating purchase ${purchase._id}:`, purchaseError);
            // Continue with other purchases even if one fails
          }
        } else {
          console.log(`⚠️ No changes needed for purchase ${purchase._id}`);
        }
      }
    } else {
      console.log("⚠️ Purchases not updated. Flag not set.");
    }

    await this.sendProductNotification(updatedProduct, 'Updated');
    await this.checkAndNotifyStock(updatedProduct);

    return {
      success: true,
      statusCode: 200,
      message: 'Product updated successfully',
      data: updatedProduct
    };

  } catch (error) {
    console.error("❌ Error updating product:", error);
    if (error instanceof CustomError) throw error;
    
    if (error.name === 'ValidationError') {
      throw new CustomError(400, Object.values(error.errors).map((err: any) => err.message).join(', '));
    }
    if (error.code === 11000) {
      throw new CustomError(400, 'Duplicate product entry');
    }
    
    throw new CustomError(500, `Failed to update product: ${error.message}`);
  }
}
  
  

  async delete(id: string) {
    try {
      const deletedProduct = await this.model.findByIdAndDelete(id);
      if (!deletedProduct) {
        throw new CustomError(404, 'Product not found');
      }

      await this.sendProductNotification(deletedProduct, 'Deleted');

      return deletedProduct;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(400, 'Product delete failed');
    }
  }

  async read(id: string, currentUserId: string) {
    try {
      // Get all users IDs that should have access
      const accessibleUserIds = await this.getAccessibleUserIds(currentUserId);
      
      console.log(`Looking for product ${id} with access for users:`, accessibleUserIds);
      
      // Look for the product with either:
      // 1. The product belongs to an accessible user, OR
      // 2. The product was created by the current user
      const product = await this.model.findOne({
        _id: id,
        $or: [
          { user: { $in: accessibleUserIds } },
          { createdBy: new Types.ObjectId(currentUserId) }
        ]
      }).populate([
        { path: 'category', select: '-__v -user' },
        { path: 'brand', select: '-__v -user' },
        { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
      ]);
      
      if (!product) {
        throw new CustomError(404, 'Product not found or access denied');
      }
      
      return product;
    } catch (error) {
      console.error("Error reading product:", error);
      if (error instanceof CustomError) throw error;
      throw new CustomError(500, 'Failed to retrieve product');
    }
  }

  /**
   * Read all products (with pagination) for the current user
   * and users created by them or the user who created them.
   */
  async readAll(query: QueryOptions = {}, currentUserId: string) {
    try {
      console.log('Reading all products for userId:', currentUserId);
      
      // Get all accessible user IDs
      let accessibleUserIds: Types.ObjectId[] = [];
      
      if (currentUserId) {
        accessibleUserIds = await this.getAccessibleUserIds(currentUserId);
      }
      
      console.log('Accessible User IDs:', accessibleUserIds);
      
      // Build the query conditions
      const baseConditions = this.buildMatchStage(query);
      
      // Create match conditions based on user access
      let matchStage: any = baseConditions;
      
      // Check the role of the current user
      let userRole = 'USER';
      if (currentUserId) {
        const currentUser = await User.findById(currentUserId);
        if (currentUser) {
          userRole = currentUser.role;
          console.log('Current user role:', userRole);
        }
      }
      
      // If user is ADMIN or SUPER_ADMIN, don't apply user-based filters
      if (!['ADMIN', 'SUPER_ADMIN', 'KEEPER'].includes(userRole) && accessibleUserIds.length > 0) {
        matchStage = { 
          ...baseConditions, 
          $or: [
            { user: { $in: accessibleUserIds } },
            { createdBy: new Types.ObjectId(currentUserId) }
          ]
        };
      }
      
      console.log('Product query match stage:', JSON.stringify(matchStage, null, 2));

      // Always ensure limit is at least 1
      if (query.limit) {
        query.limit = Math.max(1, Number(query.limit));
      }

      const pipeline = this.buildPipeline(matchStage, query);
      const safePipeline = this.ensurePipelineIsArray(pipeline);
      console.log('Pipeline:', JSON.stringify(safePipeline, null, 2));
      
      let data = await this.model.aggregate(safePipeline);

      // Totals
      const totalsPipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
          }
        }
      ];
      const totals = await this.model.aggregate(this.ensurePipelineIsArray(totalsPipeline));

      const countPipeline = [
        { $match: matchStage },
        { $count: 'total' }
      ];
      const totalCount = await this.model.aggregate(this.ensurePipelineIsArray(countPipeline));

      // Populate related fields
      data = await this.model.populate(data, [
        { path: 'category', select: '-__v -user' },
        { path: 'brand', select: '-__v -user' },
        { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
      ]);

      const summary = totals[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0
      };

      return {
        data,
        totalCount: totalCount[0]?.total || 0,
        summary
      };
    } catch (error) {
      console.error("Error reading all products:", error);
      throw new CustomError(500, 'Failed to retrieve products');
    }
  }

  /**
   * Read all public products for allowed users.
   */
  async readAllPublic(query: QueryOptions = {}, currentUserId: string) {
    try {
      console.log('Reading public products for userId:', currentUserId);
      
      let accessibleUserIds: Types.ObjectId[] = [];
      
      if (currentUserId) {
        // Get all accessible user IDs
        accessibleUserIds = await this.getAccessibleUserIds(currentUserId);
      }
      
      console.log('Accessible User IDs for public view:', accessibleUserIds);
      
      // Build the query conditions
      const baseConditions = this.buildMatchStage(query);
      
      // Check the role of the current user
      let userRole = 'USER';
      if (currentUserId) {
        const currentUser = await User.findById(currentUserId);
        if (currentUser) {
          userRole = currentUser.role;
          console.log('Current user role for public view:', userRole);
        }
      }
      
      // Create match stage based on user role
      let matchStage = baseConditions;
      
      // If user is not an admin and is authenticated, apply user-based filters
      if (!['ADMIN', 'SUPER_ADMIN', 'KEEPER'].includes(userRole) && accessibleUserIds.length > 0) {
        matchStage = { 
          ...baseConditions, 
          $or: [
            { user: { $in: accessibleUserIds } },
            { createdBy: new Types.ObjectId(currentUserId) }
          ]
        };
      }
      
      console.log('Public product query match stage:', JSON.stringify(matchStage, null, 2));
      
      // Always ensure limit is at least 1
      if (query.limit) {
        query.limit = Math.max(1, Number(query.limit));
      }
      
      const pipeline = this.buildPipeline(matchStage, query);
      const safePipeline = this.ensurePipelineIsArray(pipeline);
      console.log('Public Pipeline:', JSON.stringify(safePipeline, null, 2));
      
      let data = await this.model.aggregate(safePipeline);

      const totalsPipeline = [
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
          }
        }
      ];
      const totals = await this.model.aggregate(this.ensurePipelineIsArray(totalsPipeline));

      const countPipeline = [
        { $match: matchStage },
        { $count: 'total' }
      ];
      const totalCount = await this.model.aggregate(this.ensurePipelineIsArray(countPipeline));

      data = await this.model.populate(data, [
        { path: 'category', select: '-__v -user' },
        { path: 'brand', select: '-__v -user' },
        { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
      ]);

      const summary = totals[0] || {
        totalProducts: 0,
        totalStock: 0,
        totalValue: 0
      };

      return {
        data,
        totalCount: totalCount[0]?.total || 0,
        summary
      };
    } catch (error) {
      console.error("Error reading public products:", error);
      throw new CustomError(500, 'Failed to retrieve public products');
    }
  }

  /**
   * Bulk delete products if they belong to allowed users.
   */
  async bulkDelete(ids: string[], currentUserId: string) {
    try {
      // Get all accessible user IDs
      const accessibleUserIds = await this.getAccessibleUserIds(currentUserId);
      
      const objectIds = ids.map(id => new Types.ObjectId(id));
      
      const result = await this.model.deleteMany({
        _id: { $in: objectIds },
        $or: [
          { user: { $in: accessibleUserIds } },
          { createdBy: new Types.ObjectId(currentUserId) }
        ]
      });
      
      return result;
    } catch (error) {
      throw new CustomError(400, 'Bulk delete failed');
    }
  }
}

const productServices = new ProductServices(Product, 'Product');
export default productServices;