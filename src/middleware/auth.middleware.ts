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
    // Read token from Authorization header: Bearer <token>
    const authHeader = req.get('authorization');
    const userAgent = req.get('user-agent')?.substring(0, 50) || 'unknown';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError("Unauthorized", 401);
    }
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) throw new AppError("Unauthorized", 401);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId?: string } | null;
    if (!decoded || !decoded.userId) throw new AppError("Unauthorized", 401);
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) throw new AppError("Unauthorized", 401);
    req.user = user;
    next();
  },
);
