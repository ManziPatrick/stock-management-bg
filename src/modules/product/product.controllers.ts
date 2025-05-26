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

// Debug version of bulk create controller with detailed logging
bulkCreate = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Comprehensive logging
    console.log('=== BULK CREATE DEBUG ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Raw body type:', typeof req.body);
    console.log('Raw body keys:', Object.keys(req.body || {}));
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    let products;
    
    // Handle different possible data structures
    if (req.body.products) {
      console.log('Found req.body.products');
      console.log('products type:', typeof req.body.products);
      console.log('products is array?', Array.isArray(req.body.products));
      products = req.body.products;
    } else if (Array.isArray(req.body)) {
      console.log('req.body is directly an array');
      products = req.body;
    } else if (req.body && typeof req.body === 'object') {
      console.log('req.body is an object, checking structure...');
      
      // Check if the object has numeric keys (might be array-like)
      const keys = Object.keys(req.body);
      const isArrayLike = keys.every(key => !isNaN(Number(key)));
      
      if (isArrayLike && keys.length > 0) {
        console.log('Converting array-like object to array');
        products = Object.values(req.body);
      } else {
        console.log('Single product object, converting to array');
        products = [req.body];
      }
    } else {
      console.log('Unrecognized data format');
      throw new CustomError(400, 'Invalid data format received');
    }
    
    console.log('Final products type:', typeof products);
    console.log('Final products is array?', Array.isArray(products));
    console.log('Final products length:', Array.isArray(products) ? products.length : 'N/A');
    
    if (Array.isArray(products) && products.length > 0) {
      console.log('First product sample:', JSON.stringify(products[0], null, 2));
    }
    
    // Validation
    if (!Array.isArray(products)) {
      const errorMsg = `Expected array but got ${typeof products}. Raw body: ${JSON.stringify(req.body)}`;
      console.error('Type error:', errorMsg);
      throw new CustomError(400, errorMsg);
    }

    if (products.length === 0) {
      throw new CustomError(400, 'Products array cannot be empty');
    }

    console.log(`Processing ${products.length} products for bulk creation`);
    
    // Generate default image URL function with category-based styling
    const generateDefaultImage = (productName: string, category: string = 'general') => {
      const encodedName = encodeURIComponent(productName.substring(0, 20));
      
      // Category-specific styling
      const categoryStyles: Record<string, { bg: string; color: string }> = {
        'electronics': { bg: '1e40af', color: 'ffffff' },
        'clothing': { bg: 'dc2626', color: 'ffffff' },
        'food': { bg: '16a34a', color: 'ffffff' },
        'books': { bg: '7c2d12', color: 'ffffff' },
        'home': { bg: '4338ca', color: 'ffffff' },
        'beauty': { bg: 'be185d', color: 'ffffff' },
        'sports': { bg: 'ea580c', color: 'ffffff' },
        'automotive': { bg: '374151', color: 'ffffff' },
      };
      
      const style = categoryStyles[category.toLowerCase()] || { bg: '4f46e5', color: 'ffffff' };
      
      return `https://via.placeholder.com/300x300/${style.bg}/${style.color}?text=${encodedName}`;
    };

    // Process products and add default images where needed
    const processedProducts = await Promise.all(
      products.map(async (product: any, index: number) => {
        try {
          console.log(`Processing product ${index + 1}:`, {
            name: product.name,
            seller: product.seller,
            category: product.category,
            price: product.price,
            stock: product.stock || product.quantity
          });

          // Parse measurement if it's a string
          let measurement;
          try {
            measurement = typeof product.measurement === 'string' 
              ? JSON.parse(product.measurement)
              : product.measurement;
              
            // Fix the measurement structure if it has 'measurement' instead of 'type'
            if (measurement && measurement.measurement && !measurement.type) {
              measurement = {
                type: measurement.measurement,
                unit: measurement.unit,
                value: measurement.value
              };
            }
          } catch (error) {
            console.warn(`Invalid measurement format for product ${index + 1}:`, product.measurement);
            // Set a default measurement structure
            measurement = {
              type: product.measurement || 'Weight',
              unit: product.unit || 'kg',
              value: product.stock || product.quantity || 1
            };
          }

          // Handle images - use provided image or generate default
          let images: string[] = [];
          if (product.image && product.image.trim()) {
            // Validate URL format
            try {
              new URL(product.image);
              images = [product.image];
              console.log(`Using provided image for product ${index + 1}`);
            } catch {
              console.warn(`Invalid image URL for product ${index + 1}, using default`);
              images = [generateDefaultImage(product.name, product.category)];
            }
          } else {
            // Generate default image
            images = [generateDefaultImage(product.name, product.category)];
            console.log(`Generated default image for product ${index + 1}`);
          }

          const productData: Partial<IProduct> = {
            name: product.name,
            seller: new Types.ObjectId(product.seller),
            category: new Types.ObjectId(product.category),
            ...(product.brand && { brand: new Types.ObjectId(product.brand) }),
            price: Number(product.price),
            stock: Number(product.stock || product.quantity),
            description: product.description || `High quality ${product.name}`,
            unit: product.unit,
            measurement: measurement,
            images: images,
            user: new Types.ObjectId(req.user._id),
            createdBy: new Types.ObjectId(req.user._id),
            isCredit: product.isCredit || false
          };

          console.log(`Product ${index + 1} processed successfully`);
          return {
            ...productData,
            originalIndex: index,
            originalName: product.name
          };
        } catch (error: any) {
          console.error(`Error processing product ${index + 1}:`, error);
          throw new CustomError(400, `Error processing product ${index + 1} (${product.name}): ${error.message}`);
        }
      })
    );

    console.log(`Successfully processed ${processedProducts.length} products for bulk creation`);
    
    // Call the enhanced bulk create service
    const result = await this.services.bulkCreate(processedProducts, req.user._id);
    
    console.log('Service result:', {
      successful: result.successful,
      failed: result.failed,
      totalProcessed: result.totalProcessed
    });
    
    // Format the response to match the frontend expectations
    const responseData = {
      successful: result.results.filter(r => r.success).map((r, index) => ({
        ...r.data,
        originalIndex: r.product.originalIndex,
        name: r.product.originalName
      })),
      failed: result.results.filter(r => !r.success).map((r, index) => ({
        originalIndex: r.product.originalIndex,
        name: r.product.originalName,
        error: r.error
      })),
      totalProcessed: result.totalProcessed,
      successfulCount: result.successful,
      failedCount: result.failed
    };

    console.log('=== BULK CREATE SUCCESS ===');
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: `Bulk upload completed: ${result.successful} successful, ${result.failed} failed`,
      data: responseData
    });
  } catch (error: any) {
    console.error('=== BULK CREATE ERROR ===');
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      statusCode: error.statusCode,
      stack: error.stack
    });
    
    sendResponse(res, {
      success: false,
      statusCode: error.statusCode || httpStatus.INTERNAL_SERVER_ERROR,
      message: error.message || 'Failed to bulk create products',
      data: {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successfulCount: 0,
        failedCount: 0
      }
    });
  }
});
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