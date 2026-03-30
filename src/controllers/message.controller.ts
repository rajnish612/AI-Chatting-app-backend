import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Message, { IMessage } from "../models/message.model";
import AppError from "../lib/AppError";
import { ApiResponse } from "../lib/ApiResponse";
import { io } from "../lib/socketInstance";
import Chat from "../models/chat.model";
import { Types } from "mongoose";
export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const chatId = req.query.chatId;

  if (!chatId) throw new AppError("Unable to fetch chats", 400);
  const messages = await Message.find({ chatId }).lean<IMessage>();

  res.status(200).json({
    message: "successfully fetched messages",
    data: messages,
    success: true,
  });
});

export const sendTextMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user._id;
    const body = req.body;
    const { message, chatId }: { message: string; chatId: string } = body;

    if (!message || !chatId) throw new AppError("Unable to fetch chats", 400);
    const newMessage: IMessage = await Message.create({
      chatId,
      text: message,
      senderId: userId,
    });
    const response: ApiResponse<IMessage> = {
      success: true,
      data: newMessage,
      message: "message sent",
    };
    res.status(200).json(response);
  },
);
