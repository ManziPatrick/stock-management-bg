
export class ApiError extends Error {
    statusCode: number;
    success: boolean;
    errors: any;
  
    constructor(statusCode: number, message: string, errors: any = {}, stack = '') {
      super(message);
      this.statusCode = statusCode;
      this.success = false;
      this.errors = errors;
  
      if (stack) {
        this.stack = stack;
      } else {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  // middleware/globalErrorHandler.ts
  import { ErrorRequestHandler } from 'express';

  
  export const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
    error.statusCode = error.statusCode || 500;
    error.success = error.success || false;
    error.message = error.message || 'Internal Server Error!';
    error.errors = error.errors || {};
  
    res.status(error.statusCode).json({
      success: error.success,
      statusCode: error.statusCode,
      message: error.message,
      errors: error.errors,
      stack: process.env.NODE_ENV === 'development' ? error.stack : null
    });
  };
  