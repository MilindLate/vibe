// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

/** Structured application error */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Wrap async route handlers to forward errors to Express error middleware */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Global error handler middleware — must be registered last */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Default values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof Error) {
    // Prisma unique constraint violation
    if ((err as any).code === 'P2002') {
      statusCode = 409;
      message = 'Resource already exists';
      details = { field: (err as any).meta?.target };
    }
    // Prisma record not found
    else if ((err as any).code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    }
    // Prisma FK constraint
    else if ((err as any).code === 'P2003') {
      statusCode = 400;
      message = 'Referenced resource does not exist';
    }
    // Multer file size
    else if ((err as any).code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'File too large';
    }
    // JWT errors
    else if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else if (err.name === 'ValidationError') {
      statusCode = 422;
      message = err.message;
    } else {
      message = config.app.isDev ? err.message : 'Internal Server Error';
    }
  }

  // Log server errors
  if (statusCode >= 500) {
    logger.error('Server error', {
      message,
      stack: (err as Error)?.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(config.app.isDev && statusCode >= 500 ? { stack: (err as Error)?.stack } : {}),
  });
}
