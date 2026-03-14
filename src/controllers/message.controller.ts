import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Message, { IMessage } from "../models/message.model";
import AppError from "../lib/AppError";
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const chatId = req.query.chatId;
  if (!chatId) throw new AppError("Unable to fetch chats", 400);
  const messages = await Message.find({ chatId }).lean<IMessage>();
  res.status(200).json({
    message: "successfully fetched messages",
    data: messages,
    sucess: true,
  });
});
