import jwt from "jsonwebtoken";
import AppError from "./AppError";
import { Response } from "express";
export const generateToken = ({
  userId,
  email,
  res,
}: {
  userId: string;
  email: string;
  res: Response;
}) => {
  
  const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new AppError("Unable to generate token", 500);
  const token = jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: "30d",
  });
  if (!token) throw new AppError("Unable to generate token", 500);
  res.cookie("token", token, {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    secure: process.env.PRODUCTION === "false" ? false : true,
     sameSite: "none",
    httpOnly: true,
  });
  return token;
};
