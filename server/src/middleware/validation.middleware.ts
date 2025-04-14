import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError, ErrorCode } from '../types';

/**
 * Middleware factory for validating request data against a Zod schema
 * @param schema Zod schema to validate against
 * @param source Where to find the data to validate ('body', 'query', 'params')
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request data against the schema
      const data = await schema.parseAsync(req[source]);
      
      // Replace the request data with the validated data
      req[source] = data;
      
      next();
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        next(new AppError(
          ErrorCode.VALIDATION_ERROR,
          `Validation error: ${validationErrors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
          400
        ));
      } else {
        next(error);
      }
    }
  };
};