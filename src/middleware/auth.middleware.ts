import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import AppError from "../lib/AppError";
import User from "../models/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
export const verifyToken = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) throw new AppError("Unauthorized", 401);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) throw new AppError("Unauthorized", 401);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) throw new AppError("Unauthorized", 401);
    req.user = user;
    next();
  },
);
