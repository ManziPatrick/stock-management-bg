export class AppError extends Error {
    public status: string;
    public isOperational: boolean;
  
    constructor(public message: string, public statusCode: number) {
      super(message);
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }