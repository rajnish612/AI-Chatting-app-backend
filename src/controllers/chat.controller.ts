import asyncHandler from "express-async-handler";
import Chat, { IChat } from "../models/chat.model";
import { ApiResponse } from "../lib/ApiResponse";
import { Request, Response } from "express";
import AppError from "../lib/AppError";
import Message, { IMessage } from "../models/message.model";
import { Types } from "mongoose";
import { io } from "../lib/socketInstance";
import User from "../models/user.model";

export const searchChats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const query = req.query.q as string;
  if (!query) throw new AppError("Query is missing", 400);

  const matchedUsers = await User.find({
    _id: { $ne: userId },
    fullName: { $regex: query, $options: "i" },
  }).select("_id");

  if (!matchedUsers.length) {
    const response: ApiResponse<IChat[]> = {
      success: true,
      data: [],
      message: "successfully fetched chats",
    };
    res.status(200).json(response);
    return;
  }

  const chats = await Chat.find({
    type: "private",
    participants: {
      $all: [
        { $elemMatch: { userId } },
        {
          $elemMatch: {
            userId: { $in: matchedUsers.map((user) => user._id) },
          },
        },
      ],
    },
  })
    .populate("participants.userId", "_id fullName profilePic")
    .populate("lastMessage")
    .sort({ lastMessageAt: -1 })
    .lean<IChat[]>();

  const response: ApiResponse<IChat[]> = {
    success: true,
    data: chats,
    message: "successfully fetched chats",
  };
  res.status(200).json(response);
});
export const getChats = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user._id;
    const chats = await Chat.find({ "participants.userId": userId })
      .populate("participants.userId", "_id fullName profilePic")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean<IChat[]>();
    const filteredChats = chats.filter((chat) => {
      const deletedEntry = chat?.deletedFor?.find(
        (del) => del.userId.toString() === userId.toString(),
      );

      if (!deletedEntry) return true;

      if (!chat.lastMessage) return false;

      return chat.lastMessage.createdAt > deletedEntry.deletedAt;
    });
    const chatsWithUnread = await Promise.all(
      filteredChats.map(async (chat) => {
        // Find current user's participant record to get their lastSeen
        const userParticipant = chat.participants.find(
          (p) => p.userId._id.toString() === userId.toString(),
        );

        const unseenCount: number = await Message.countDocuments({
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

    const response: ApiResponse<IChat[]> = {
      success: true,
      data: chatsWithUnread,
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
    const response: ApiResponse<Types.ObjectId[]> = {
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
export const createOrGetPrivateChat = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId: otherUserId } = req.query as { userId: string };

    const userId = req.user._id;
    if (!otherUserId) throw new AppError("otherUserId is required", 400);
    let chat = await Chat.findOne({
      type: "private",
      participants: {
        $all: [
          { $elemMatch: { userId: userId } },
          { $elemMatch: { userId: otherUserId } },
        ],
      },
    });
    if (!chat) {
      chat = await Chat.create({
        type: "private",
        participants: [
          { userId: userId, lastSeen: new Date(Date.now() - 1000) },
          { userId: otherUserId, lastSeen: new Date() },
        ],
      });
    }
    const response: ApiResponse<IChat> = {
      success: true,
      data: chat,
      message: "successfully fetched chats",
    };
    res.status(200).json(response);
  },
);
export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  const chatId = req.query.chatId;
  const userId = req.user._id;
  if (!chatId) throw new AppError("Unable to fetch chats", 400);
  let chat = await Chat.findOneAndUpdate(
    { _id: chatId, "deletedFor.userId": userId },
    {
      $set: { "deletedFor.$.deletedAt": new Date() },
    },
    { returnDocument: "after" },
  )
    .populate("participants.userId", "_id fullName profilePic")
    .lean();
  if (!chat) {
    chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { deletedFor: { userId, deletedAt: new Date() } },
      },
      { returnDocument: "after" },
    );
  }

  const response: ApiResponse<IChat> = {
    success: true,
    data: chat,
    message: "successfully deleted chat",
  };
  res.status(200).json(response);
});
export const getGroupChats = () => {};
export const getUnreadChats = () => {};
