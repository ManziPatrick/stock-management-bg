//@ts-nocheck
import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import productServices from './product.services';
import { upload, uploadToCloudinary } from '../image/cloudinaryConfig';
import { Request, Response } from 'express';
import CustomError from '../utils/customError';
import { Types } from 'mongoose';
import { IProduct } from './product.interface';
import Purchase from '../purchase/purchase.model';
import Product from './product.model';

class ProductControllers {
  services = productServices;

  /**
   * create new product
   */

create = [
  upload.array('images', 5),
  uploadToCloudinary,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const imageUrls = (req.body as any).cloudinaryUrls || [];
      
      // Parse measurement if it's a string
      let measurement;
      try {
        measurement = typeof req.body.measurement === 'string' 
          ? JSON.parse(req.body.measurement)
          : req.body.measurement;
          
        // Fix the measurement structure if it has 'measurement' instead of 'type'
        if (measurement && measurement.measurement && !measurement.type) {
          measurement = {
            type: measurement.measurement,
            unit: measurement.unit,
            value: measurement.value
          };
        }
      } catch (error) {
        throw new CustomError(400, 'Invalid measurement format');
      }

      const productData: Partial<IProduct> = {
        name: req.body.name,
        seller: new Types.ObjectId(req.body.seller),
        category: new Types.ObjectId(req.body.category),
        ...(req.body.brand && { brand: new Types.ObjectId(req.body.brand) }),
        price: Number(req.body.price),
        stock: Number(req.body.quantity),
        description: req.body.description,
        unit: req.body.unit,
        measurement: measurement,
        images: imageUrls,
        user: new Types.ObjectId(req.user._id),
        createdBy: new Types.ObjectId(req.user._id)
      };

      console.log('Product data before sending to service:', productData);
      const result = await this.services.create(productData, req.user._id);
      sendResponse(res, result);
    } catch (error: any) {
      console.error('Error in product creation controller:', error);
      sendResponse(res, {
        success: false,
        statusCode: error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to create product'
      });
    }
  })
];
  /**
   * Add product to stock
   */
  addStock = asyncHandler(async (req, res) => {
    const result = await this.services.addToStock(req.params.id, req.body, req.user._id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product stock added successfully!',
      data: result
    });
  });

  /**
   * Get all products user has access to with query
   */
  readAll = asyncHandler(async (req, res) => {
    const result = await this.services.readAll(req.query, req.user._id);
console.log("kjk,h",)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'All products retrieved successfully',
      meta: {
        page,
        limit,
        total: result?.totalCount || 0,
        totalPage: Math.ceil(result?.totalCount / limit)
      },
      data: result.data
    });
  });

  /**
   * Get total product
   */
  getTotalProduct = asyncHandler(async (req, res) => {
    const result = await this.services.countTotalProduct(req.user._id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Count total products successfully',
      data: result
    });
  });

  /**
   * Get single product of user
   */
  readSingle = asyncHandler(async (req, res) => {
    const result = await this.services.read(req.params.id, req.user._id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product fetched successfully!',
      data: result
    });
  });

  /**
   * update product
   */
  updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatePurchases = req.query.updatePurchases === 'true';
    const payload = req.body;
  
    const result = await productServices.update(id, payload, { 
      updatePurchases,
      userId: req.user._id 
    });

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product updated successfully!',
      data: result,
    });
  });

  readAllPublic = asyncHandler(async (req, res) => {
    try {
      // console.log("hhjkkkiiuun",req)
      // If user is not authenticated, pass a default ID or null to the service
      const userId = req.user?._id || null;
      console.log("hh000jkkkiiuun",userId)
      
      const result = await this.services.readAllPublic(req.query, userId);
  
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
  
      // Return the response with pagination data
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'All products retrieved successfully',
        meta: {
          page,
          limit,
          total: result?.totalCount || 0,
          totalPage: Math.ceil(result?.totalCount / limit),
          summary: result?.summary || null,
        },
        data: result.data,
      });
    } catch (error) {
      console.error(error);
      sendResponse(res, {
        success: false,
        statusCode: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to retrieve products',
      });
    }
  });

  /**
   * delete product
   */
  delete = asyncHandler(async (req, res) => {
    await this.services.delete(req.params.id, req.user._id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product delete successfully!'
    });
  });

  /**
   * Get collection discrepancies
   */
  getCollectionDiscrepancies = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Default pagination
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      // Get accessible user IDs for filtering
      const accessibleUserIds = await this.services.getAccessibleUserIds(req.user._id);
      
      // Aggregate pipeline to find discrepancies
      const discrepancies = await Product.aggregate([
        // First, filter by accessible users
        {
          $match: {
            $or: [
              { user: { $in: accessibleUserIds } },
              { createdBy: new Types.ObjectId(req.user._id) }
            ]
          }
        },
        // Lookup purchases for each product
        {
          $lookup: {
            from: 'purchases',
            localField: '_id',
            foreignField: 'product',
            as: 'purchases'
          }
        },
        // Unwind purchases array to compare each purchase
        { $unwind: '$purchases' },
        // Match documents where there are differences
        {
          $match: {
            $or: [
              // Compare measurement type
              { $expr: { $ne: ['$measurement.type', '$purchases.measurement.type'] } },
              // Compare measurement value
              { $expr: { $ne: ['$measurement.value', '$purchases.measurement.value'] } },
              // Compare measurement unit
              { $expr: { $ne: ['$measurement.unit', '$purchases.measurement.unit'] } },
              // Compare price with unitPrice
              { $expr: { $ne: ['$price', '$purchases.unitPrice'] } }
            ]
          }
        },
        // Group back by product to avoid duplicates
        {
          $group: {
            _id: '$_id',
            product: { $first: '$$ROOT' },
            discrepantPurchases: {
              $push: {
                purchaseId: '$purchases._id',
                purchaseMeasurement: '$purchases.measurement',
                purchaseUnitPrice: '$purchases.unitPrice',
                purchaseDate: '$purchases.createdAt'
              }
            }
          }
        },
        // Add additional product fields
        {
          $project: {
            _id: 1,
            name: '$product.name',
            productMeasurement: '$product.measurement',
            productPrice: '$product.price',
            discrepantPurchases: 1,
            totalDiscrepancies: { $size: '$discrepantPurchases' }
          }
        },
        // Skip and limit for pagination
        { $skip: skip },
        { $limit: limit }
      ]);

      // Get total count for pagination with the same user access filtering
      const totalCount = await Product.aggregate([
        // First, filter by accessible users
        {
          $match: {
            $or: [
              { user: { $in: accessibleUserIds } },
              { createdBy: new Types.ObjectId(req.user._id) }
            ]
          }
        },
        { $lookup: { from: 'purchases', localField: '_id', foreignField: 'product', as: 'purchases' } },
        { $unwind: '$purchases' },
        {
          $match: {
            $or: [
              { $expr: { $ne: ['$measurement.type', '$purchases.measurement.type'] } },
              { $expr: { $ne: ['$measurement.value', '$purchases.measurement.value'] } },
              { $expr: { $ne: ['$measurement.unit', '$purchases.measurement.unit'] } },
              { $expr: { $ne: ['$price', '$purchases.unitPrice'] } }
            ]
          }
        },
        { $group: { _id: '$_id' } },
        { $count: 'total' }
      ]);

      const total = totalCount[0]?.total || 0;

      // Send response
      sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: 'Collection discrepancies retrieved successfully',
        meta: {
          page,
          limit,
          total,
          totalPage: Math.ceil(total / limit)
        },
        data: discrepancies.map(item => ({
          productId: item._id,
          productName: item.name,
          productMeasurement: item.productMeasurement,
          productPrice: item.productPrice,
          discrepantPurchases: item.discrepantPurchases,
          totalDiscrepancies: item.totalDiscrepancies
        }))
      });
    } catch (error: any) {
      sendResponse(res, {
        success: false,
        statusCode: error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || 'Failed to retrieve collection discrepancies'
      });
    }
  });

  /**
   * Bulk delete products
   */
  bulkDelete = asyncHandler(async (req, res) => {
    await this.services.bulkDelete(req.body.ids, req.user._id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Delete Selected Products successfully!'
    });
  });
}

const productControllers = new ProductControllers();
export default productControllers;