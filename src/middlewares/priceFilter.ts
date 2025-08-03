import { RequestHandler } from 'express';
import { TUserRole } from '../constant/userRole';

/**
 * Middleware to filter price fields based on user role
 * Only ADMIN and SUPER_ADMIN can see the original price
 * All other users only see the default_price
 */
export const filterPriceFields = (data: any, userRole?: TUserRole): any => {
  if (!data) return data;

  const canSeeOriginalPrice = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  // Handle single product object
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (data.price !== undefined && !canSeeOriginalPrice) {
      const { price, ...filteredData } = data;
      return filteredData;
    }
    return data;
  }

  // Handle array of products
  if (Array.isArray(data)) {
    return data.map(item => {
      if (item && typeof item === 'object' && item.price !== undefined && !canSeeOriginalPrice) {
        const { price, ...filteredItem } = item;
        return filteredItem;
      }
      return item;
    });
  }

  return data;
};

/**
 * Express middleware to filter response data based on user role
 */
export const applyPriceFilter: RequestHandler = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(body: any) {
    if (body && body.data) {
      body.data = filterPriceFields(body.data, req.user?.role);
    }
    return originalJson.call(this, body);
  };
  
  next();
};

/**
 * Check if user can set original price
 */
export const canSetOriginalPrice = (userRole?: TUserRole): boolean => {
  return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
};