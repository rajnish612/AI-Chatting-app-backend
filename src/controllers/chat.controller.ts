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
    const chats = await Chat.find({ "participants.userId": userId })
      .populate("participants.userId", "_id fullName profilePic")
      .lean<IChat[]>();
    const filteredChats = chats.map((chat) => ({
      ...chat,
      participants: chat.participants.filter(
        (participant) =>
          participant.userId._id.toString() !== userId.toString(),
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

export const getParticipants = asyncHandler(
  async (req: Request, res: Response) => {
    const chatId = req.query.chatId;
    const userId = req.user._id;

    if (!chatId) throw new AppError("Unable to fetch chats", 400);

    const chat = await Chat.findById(chatId)
      .select("participants")
      .populate("participants.userId", "_id fullName profilePic")
      .lean();
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
