import jwt from "jsonwebtoken";
import AppError from "./AppError";
import { Response } from "express";
export const generateToken = ({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) => {
  const JWT_SECRET: string | undefined = process.env.JWT_SECRET;
  if (!JWT_SECRET) throw new AppError("Unable to generate token", 500);
  const token = jwt.sign({ userId, email }, JWT_SECRET, {
    expiresIn: "30d",
  });
  if (!token) throw new AppError("Unable to generate token", 500);
  console.log(`[Token] Generated token for user ${userId}`);
  return token;
};
