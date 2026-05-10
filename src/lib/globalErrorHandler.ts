import { Request, Response, NextFunction } from "express";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err?.name === "ValidationError") {
    statusCode = 400;
    const validationMessages = Object.values(err.errors || {})
      .map((item: any) => item?.message)
      .filter(Boolean);
    message = validationMessages.length
      ? validationMessages.join(", ")
      : "Validation failed";
  }

  if (err?.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err?.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyValue || {})[0] || "field";
    message = `${duplicatedField} already exists`;
  }

  if (err?.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token";
  }

  if (err?.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired";
  }

  if (!err?.statusCode && statusCode === 500) {
    message = "Something went wrong";
  }

  res.status(statusCode).json({
    success: false,
    message,
    statusCode,
  });
};
