import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCode, ApiResponse } from '../types';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  // Default error values
  let statusCode = 500;
  let errorCode = ErrorCode.INTERNAL_ERROR;
  let message = 'Internal server error';

  // Handle AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
  } 
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ErrorCode.UNAUTHORIZED;
    message = 'Invalid token';
  } 
  // Handle validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = ErrorCode.VALIDATION_ERROR;
    message = err.message;
  }
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    statusCode = 400;
    
    // Handle specific Prisma error codes
    if (prismaError.code === 'P2002') {
      errorCode = ErrorCode.CONFLICT;
      message = 'A record with this value already exists';
    } else if (prismaError.code === 'P2025') {
      errorCode = ErrorCode.NOT_FOUND;
      message = 'Record not found';
    } else {
      errorCode = ErrorCode.VALIDATION_ERROR;
      message = 'Database operation failed';
    }
  }

  // Construct error response
  const errorResponse: ApiResponse<null> = {
    success: false,
    error: {
      code: errorCode,
      message: message
    }
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const errorResponse: ApiResponse<null> = {
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  };
  
  res.status(404).json(errorResponse);
};