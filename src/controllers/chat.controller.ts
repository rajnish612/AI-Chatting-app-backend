import asyncHandler from "express-async-handler";
import Chat, { IChat } from "../models/chat.model";
import { ApiResponse } from "../lib/ApiResponse";
import { Request, Response } from "express";
import AppError from "../lib/AppError";
import Message, { IMessage } from "../models/message.model";
import { Types } from "mongoose";
import { io } from "../lib/socketInstance";
export const getChats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user._id;
    const chats = await Chat.find({ "participants.userId": userId })
      .populate("participants.userId", "_id fullName profilePic")
      .lean<IChat[]>();

    const chatsWithUnread = await Promise.all(
      chats.map(async (chat) => {
        // Find current user's participant record to get their lastSeen
        const userParticipant = chat.participants.find(
          (p) => p.userId._id.toString() === userId.toString(),
        );

        const unseenCount = await Message.countDocuments({
          chatId: chat._id,
          createdAt: { $gt: userParticipant?.lastSeen || new Date(0) },
          senderId: { $ne: userId },
        });

        return {
          ...chat,
          unseenCount,
        };
      }),
    );

    const filteredChats = chatsWithUnread.map((chat) => ({
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
    const filteredParticipants = chat?.participants.filter(
      (participant: any) =>
        participant.userId._id.toString() !== userId.toString(),
    );
    const response: ApiResponse<Types.ObjectId> = {
      success: true,
      data: filteredParticipants,
      message: "successfully fetched chats",
    };

    res.status(200).json(response);
  },
);
export const updateLastSeen = asyncHandler(
  async (req: Request, res: Response) => {
    const chatId = req.query.chatId;
    const userId = req.user._id;
    if (!chatId) throw new AppError("Unable to fetch chats", 400);
    const chat = await Chat.findOneAndUpdate(
      { _id: chatId, "participants.userId": userId },
      { $set: { "participants.$.lastSeen": new Date() } },
      { returnDocument: "after" },
    )
      .populate("participants.userId", "_id fullName profilePic")
      .select("participants")
      .lean();
    io.to(chatId?.toString()).emit("message-seen", {
      userId,
      lastSeen: new Date(),
    });
    const response: ApiResponse<IChat> = {
      success: true,
      data: chat,
      message: "successfully fetched chats",
    };
    res.status(200).json(response);
  },
);
export const getGroupChats = () => {};
export const getUnreadChats = () => {};
