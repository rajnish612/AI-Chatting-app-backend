import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const statusCode = err.statusCode || 500;

  const message = err.statusCode ? err.message : "Something went wrong";


  res.status(statusCode).json({
    success: false,
    message,
  });
};
