import asyncHandler from "express-async-handler";
import Chat, { IChat } from "../models/chat.model";
import { ApiResponse } from "../lib/ApiResponse";
import { Request, Response } from "express";
import AppError from "../lib/AppError";
import Message, { IMessage } from "../models/message.model";
import { Types } from "mongoose";
export const getChats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user._id;
    const chats = await Chat.find({ participants: { $in: [userId] } }).lean<
      IChat[]
    >();

    const filteredChats = chats.map((chat) => ({
      ...chat,
      participants: chat.participants.filter(
        (_id) => _id.toString() !== userId.toString(),
      ),
    }));
    const response: ApiResponse<IChat[]> = {
      success: true,
      data: filteredChats,
      message: "successfully fetched chats",
    };
    res.status(200).json(response);
  },
);
export const getUnseenCount = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const chatId = req.query.chatId;
    const userId = req.user._id;

    if (!chatId) throw new AppError("Unable to fetch chats", 400);

    const unseenCount = await Message.countDocuments({
      chatId,
      senderId: { $ne: userId },
      seenBy: { $nin: [userId] },
    }).lean<number>();
    const response: ApiResponse<number> = {
      success: true,
      data: unseenCount,
      message: "successfully fetched chats",
    };

    res.status(200).json(response);
  },
);

export const getParticipants = asyncHandler(
  async (req: Request, res: Response) => {
    const chatId = req.query.chatId;
    const userId = req.user._id;

    if (!chatId) throw new AppError("Unable to fetch chats", 400);

    const chat = await Chat.findById(chatId).select("participants").lean();
    const response: ApiResponse<Types.ObjectId> = {
      success: true,
      data: chat.participants,
      message: "successfully fetched chats",
    };
    res.status(200).json(response);
  },
);
export const getGroupChats = () => {};
export const getUnreadChats = () => {};
