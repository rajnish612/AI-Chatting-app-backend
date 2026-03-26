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
export const seeMessage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const chatId = req.query.chatId;
  if (!chatId) throw new AppError("Unable to seen chats", 400);
  const chat = await Chat.findById(chatId).select("participants").lean();
  const seeMessages = await Message.updateMany(
    { chatId: chatId, seenBy: { $ne: userId } },
    { $addToSet: { seenBy: userId } },
  );
  io.to(chatId.toString()).emit("message-seen", {
    chatId,
    userId,
  });
  const response: ApiResponse<string> = {
    success: true,
    data: "seen",
    message: "message sent",
  };
  res.status(200).json(response);
});
export const checkSeen = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { messageId } = req.body;

  const message = await Message.findById(messageId);
  const chat = await Chat.findById(message.chatId);

  const otherUsers = chat.participants.filter(
    (id: Types.ObjectId) => id.toString() !== userId.toString(),
  );

  const isSeenByAll = otherUsers.every((id: Types.ObjectId) =>
    message.seenBy.some(
      (seenId: Types.ObjectId) => seenId.toString() === id.toString(),
    ),
  );
  console.log("seen", isSeenByAll);

  res.json({
    success: true,
    data: isSeenByAll,
    message: "checked if message is seen or not",
  });
});
