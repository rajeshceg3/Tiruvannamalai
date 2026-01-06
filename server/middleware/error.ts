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

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // If headers are already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

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
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
