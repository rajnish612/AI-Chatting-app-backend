import asyncHandler from "express-async-handler";
import Chat, { IChat } from "../models/chat.model";
import { ApiResponse } from "../lib/ApiResponse";
import { Types } from "mongoose";

export const getChats = asyncHandler(async (req, res): Promise<void> => {
  const userId = req.user._id;
  const chats = await Chat.find({ participants: { $in: [userId] } }).lean<
    IChat[]
  >();
  const filteredChats = chats.map((chat) => ({
    ...chat,
    participants: chat.participants.filter((_id) => _id !== userId),
  }));
  const response: ApiResponse<IChat[]> = {
    success: true,
    data: filteredChats,
    message: "successfully fetched chats",
  };
  res.status(200).json(response);
});

export const getGroupChats = () => {};
export const getUnreadChats = () => {};
