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
  minStockAlert?: number; // Add this to allow custom minimum stock levels
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
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  private buildMatchStage(query: QueryOptions, userId?: string) {
    return {
      $match: {
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
      }
    };
  }

  private buildPipeline(matchStage: any, query: QueryOptions) {
    return [
      matchStage,
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
      // Log specific error details
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
      // Log specific error details
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
  }
  
  private async checkAndNotifyStock(product: IProduct, minStockAlert?: number): Promise<void> {
    const stockThreshold = minStockAlert ?? 5; // Use provided value or default to 5
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
  // Rest of your existing methods with added notification calls
 private validateMeasurement(measurement: IMeasurement): boolean {
    const unitMappings = {
      weight: ['g', 'kg', 'lb'],
      length: ['cm', 'm', 'inch'],
      volume: ['ml', 'l', 'oz'],
      pieces: ['pc', 'dozen', 'set'],
      size: ['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'XXL', 'XXXL',
             'EU_36', 'EU_37', 'EU_38', 'EU_39', 'EU_40', 'EU_41', 'EU_42', 
             'EU_43', 'EU_44', 'EU_45', 'EU_46', 'EU_47']
    };

    return (
      measurement.type in unitMappings &&
      unitMappings[measurement.type].includes(measurement.unit) &&
      (measurement.type === 'size' || typeof measurement.value === 'number')
    );
  }

  async create(payload: Partial<IProduct>, userId: string): Promise<ProductCreateResponse> {
    try {
      const productData = {
        ...payload,
        user: new Types.ObjectId(userId),
        seller: new Types.ObjectId(payload.seller),
        category: new Types.ObjectId(payload.category),
        ...(payload.brand && { brand: new Types.ObjectId(payload.brand) }),
        stock: Number(payload.stock),
      };

      const seller = await Seller.findById(payload.seller);
      if (!seller) {
        throw new CustomError(404, 'Seller not found');
      }

      if (payload.measurement) {
        if (!this.validateMeasurement(payload.measurement)) {
          throw new CustomError(400, 'Invalid measurement data');
        }
      }

      const product = await this.model.create(productData);
      
      // Send notification for new product
      await this.sendProductNotification(product, 'Created');
      await this.checkAndNotifyStock(product);

      return {
        success: true,
        statusCode: 201,
        message: 'Product created successfully',
        data: product
      };
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        throw new CustomError(400, Object.values(error.errors).map((err: any) => err.message).join(', '));
      }
      if (error.code === 11000) {
        throw new CustomError(400, 'Duplicate product entry');
      }
      throw new CustomError(500, 'Failed to create product');
    }
  }

  async update(id: string, payload: Partial<IProduct>) {
    try {
      if (payload.measurement) {
        if (!this.validateMeasurement(payload.measurement)) {
          throw new CustomError(400, 'Invalid measurement data');
        }
      }

      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        {
          ...payload,
          ...(payload.seller && { seller: new Types.ObjectId(payload.seller) }),
          ...(payload.category && { category: new Types.ObjectId(payload.category) }),
          ...(payload.brand && { brand: new Types.ObjectId(payload.brand) })
        },
        { new: true }
      ).populate([
        { path: 'category', select: '-__v -user' },
        { path: 'brand', select: '-__v -user' },
        { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
      ]);

      if (!updatedProduct) {
        throw new CustomError(404, 'Product not found');
      }

      // Send notification for product update
      await this.sendProductNotification(updatedProduct, 'Updated');
      await this.checkAndNotifyStock(updatedProduct);

      return updatedProduct;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(400, 'Product update failed');
    }
  }

  async addToStock(id: string, payload: StockUpdate, userId: string) {
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const seller = await Seller.findById(payload.seller).session(session);
      if (!seller) {
        throw new CustomError(404, 'Seller not found');
      }
  
      const product = await this.model.findById(id).session(session);
      if (!product) {
        throw new CustomError(404, 'Product not found');
      }
  
      if (payload.stock <= 0) {
        throw new CustomError(400, 'Stock quantity must be greater than 0');
      }
  
      const updatedProduct = await this.model.findByIdAndUpdate(
        id,
        { $inc: { stock: payload.stock } },
        { new: true, session }
      );
  
      await Purchase.create(
        [{
          user: userId,
          seller: product.seller,
          product: product._id,
          sellerName: seller.name,
          productName: product.name,
          quantity: payload.stock,
          unitPrice: product.price,
          totalPrice: payload.stock * product.price,
          measurement: product.measurement,
        }],
        { session }
      );
  
      await session.commitTransaction();
      session.endSession();

      // Send notification for stock update
      await this.sendProductNotification(updatedProduct, 'Stock Updated', 
        `Stock increased by ${payload.stock} units`);
      await this.checkAndNotifyStock(updatedProduct, payload.minStockAlert);
  
      return updatedProduct;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
  
      if (error instanceof CustomError) throw error;
      throw new CustomError(400, 'Add to stock failed');
    }
  }

  async delete(id: string) {
    try {
      const deletedProduct = await this.model.findByIdAndDelete(id);
      if (!deletedProduct) {
        throw new CustomError(404, 'Product not found');
      }

      // Send notification for product deletion
      await this.sendProductNotification(deletedProduct, 'Deleted');

      return deletedProduct;
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw new CustomError(400, 'Product delete failed');
    }
  }

  // Include all other existing methods without changes
  
  async readAllPublic(query: QueryOptions = {}) {
    // Build the match stage with name functionality
    const matchStage = this.buildMatchStage(query);
  
    // Build the pipeline with the match stage and any additional stages
    const pipeline = this.buildPipeline(matchStage, query);
  
    // Fetch paginated data
    let data = await this.model.aggregate(pipeline);
    // await this.sendProductNotification("welcome",'data');

    // Fetch the total count for pagination
    const totalCount = await this.model.aggregate([
      matchStage,
      { $count: 'total' }
    ]);
  
    // Populate related fields for better readability
    data = await this.model.populate(data, [
      { path: 'category', select: '-__v -user' },
      { path: 'brand', select: '-__v -user' },
      { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
    ]);
  
    return { 
      data, 
      totalCount: totalCount[0]?.total || 0 
    };
  }

  async countTotalProduct(userId?: string) {
    try {
      const pipeline = [
        ...(userId ? [{ $match: { user: new Types.ObjectId(userId) } }] : []),
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
          }
        }
      ];

      const result = await this.model.aggregate(pipeline);
      return result[0] || { totalProducts: 0, totalStock: 0, totalValue: 0 };
    } catch (error) {
      throw new CustomError(500, 'Failed to count total products');
    }
  }

  async readAll(query: QueryOptions = {}) {
    const matchStage = this.buildMatchStage(query);
    const pipeline = this.buildPipeline(matchStage, query);
    
    let data = await this.model.aggregate(pipeline);
    const totalCount = await this.model.aggregate([matchStage, { $count: 'total' }]);

    data = await this.model.populate(data, [
      { path: 'category', select: '-__v -user' },
      { path: 'brand', select: '-__v -user' },
      { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
    ]);

    return { 
      data, 
      totalCount: totalCount[0]?.total || 0 
    };
  }

  async read(id: string, userId: string) {
    const product = await this.model.findOne({ 
      user: new Types.ObjectId(userId), 
      _id: id 
    }).populate([
      { path: 'category', select: '-__v -user' },
      { path: 'brand', select: '-__v -user' },
      { path: 'seller', select: '-__v -user -createdAt -updatedAt' }
    ]);

    if (!product) {
      throw new CustomError(404, 'Product not found');
    }

    return product;
  }

  async bulkDelete(ids: string[]) {
    try {
      const objectIds = ids.map(id => new Types.ObjectId(id));
      const result = await this.model.deleteMany({ _id: { $in: objectIds } });
      return result;
    } catch (error) {
      throw new CustomError(400, 'Bulk delete failed');
    }
  }

}

const productServices = new ProductServices(Product, 'Product');
export default productServices;