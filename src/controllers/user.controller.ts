import asyncHandler from "express-async-handler";
import Chat, { IChat } from "../models/chat.model";
import { ApiResponse } from "../lib/ApiResponse";
import { Request, Response } from "express";
import AppError from "../lib/AppError";
import User, { IUser } from "../models/user.model";
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const _id = req.params._id;
  if (!_id) throw new AppError("id is missiing", 400);
  const user = await User.findById(_id).select("-password");
  const response: ApiResponse<IUser> = {
    data: user,
    message: "successfully fetched user",
    success: true,
  };
  res.status(200).json(response);
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const users = await User.find({ _id: { $ne: userId } }).select(
    "_id fullName profilePic",
  );
  const response: ApiResponse<IUser[]> = {
    data: users,
    message: "successfully fetched users",
    success: true,
  };
  res.status(200).json(response);
});
