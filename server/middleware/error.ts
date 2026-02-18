import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  // If headers are already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine status code
  let statusCode = 500;
  let message = "Internal Server Error";
  let stack: string | undefined = undefined;

  if (err instanceof AppError) {
      statusCode = err.statusCode;
      message = err.message;
  } else if (err instanceof Error) {
      // If it's a generic error but has a statusCode property (e.g. from some library)
      // we can try to use it, but safely.
      if ('statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
           statusCode = (err as { statusCode: number }).statusCode;
      }
      message = err.message;
      stack = err.stack;
  }

  // Log error (consider using a structured logger in production)
  // We mask the stack trace in production for security
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction || statusCode >= 500) {
    console.error(`[Error] ${req.method} ${req.path}:`, err);
  }

  // Handle specific error types (e.g., Zod)
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation Error",
      errors: err.errors,
    });
  }

  res.status(statusCode).json({
    message: isProduction && statusCode === 500 ? "Internal Server Error" : message,
    ...(isProduction ? {} : { stack }),
  });
};
