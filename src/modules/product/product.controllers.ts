import httpStatus from 'http-status';
import asyncHandler from '../../lib/asyncHandler';
import sendResponse from '../../lib/sendResponse';
import productServices from './product.services';
import { upload, uploadToCloudinary } from '../image/cloudinaryConfig';
import { Request, Response } from 'express';
import  CustomError  from '../utils/customError';
import { Types } from 'mongoose';
import { IProduct } from './product.interface';

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
        
        const measurement = typeof req.body.measurement === 'string' 
          ? JSON.parse(req.body.measurement)
          : req.body.measurement;

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
          user: new Types.ObjectId(req.user._id)
        };

        const result = await this.services.create(productData, req.user._id);
        sendResponse(res, result);
      } catch (error: any) {
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
   * Get all product of user with query
   */

  readAll = asyncHandler(async (req, res) => {
    const result = await this.services.readAll(req.query);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'All products retrieved successfully',
      meta: {
        page,
        limit,
        total: result?.totalCount[0]?.total || 0,
        totalPage: Math.ceil(result?.totalCount[0]?.total / page)
      },
      data: result.data
    });
  });

  /**
   * Get total product
   */
  getTotalProduct = asyncHandler(async (req, res) => {
    const result = await this.services.countTotalProduct();
      sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Count total products successfully',
      data: result[0]
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
  update = asyncHandler(async (req, res) => {
    const result = await this.services.update(req.params.id, req.body);
      sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product updated successfully!',
      data: result
    });
  });

  readAllPublic = asyncHandler(async (req, res) => {
  try {
    const result = await this.services.readAllPublic(req.query);

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
    // Handling unexpected errors and sending an error response
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
    await this.services.delete(req.params.id);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Product delete successfully!'
    });
  });

  /**
   * delete multiple product
   */
  
  bulkDelete = asyncHandler(async (req, res) => {
    await this.services.bulkDelete(req.body);

    sendResponse(res, {
      success: true,
      statusCode: httpStatus.OK,
      message: 'Delete Selected Product successfully!'
    });
  });
}

const productControllers = new ProductControllers();
export default productControllers;
