import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      // Format validation errors for better client-side handling
      const errorMessages = error.errors?.map((err: any) => {
        const field = err.path.join('.');
        return `${field}: ${err.message}`;
      }) || ['Validation failed'];
      
      return res.status(400).json({
        success: false,
        error: {
          message: errorMessages.join('; '),
          details: error.errors,
        },
      });
    }
  };
};
