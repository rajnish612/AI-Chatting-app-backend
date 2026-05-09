import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import Message, { IMessage } from "../models/message.model";
import AppError from "../lib/AppError";
import { ApiResponse } from "../lib/ApiResponse";
import { io } from "../lib/socketInstance";
import Chat from "../models/chat.model";
import { Types } from "mongoose";
import { generateAiReply } from "../agent/agent";

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const chatId = req.query.chatId;
  const skip = parseInt(req.query.skip as string);
  console.log("skip", skip);

  if (!chatId) throw new AppError("Unable to fetch chats", 400);
  const chat = await Chat.findById(chatId).lean();

  const deletedEntry = chat.deletedFor.find(
    (del: { userId: Types.ObjectId; deletedAt?: Date }) =>
      del.userId.toString() === userId.toString(),
  );

  const deletedAt = deletedEntry?.deletedAt;
  const messages = await Message.find({
    chatId,
    ...(deletedAt && { createdAt: { $gt: deletedAt } }),
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .skip(skip)
    .lean<IMessage[]>();

  res.status(200).json({
    message: "successfully fetched messages",
    data: messages.reverse(),
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
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $set: { lastMessage: newMessage._id, lastMessageAt: new Date() },
      },
      { returnDocument: "after" },
    )
      .populate("lastMessage")
      .populate("participants.userId", "_id fullName profilePic botOn")
      .lean();
    const filteredParticipants = updatedChat.participants.filter(
      (participant: { userId: { _id: string; botOn: boolean } }) => {
        return participant.userId._id.toString() !== userId.toString();
      },
    );
    await Promise.all(
      updatedChat.participants.map(
        async (participant: { userId: { _id: string }; lastSeen?: Date }) => {
          const participantId = participant.userId._id.toString();
          const unseenCount =
            participantId === userId.toString()
              ? 0
              : await Message.countDocuments({
                  chatId,
                  createdAt: { $gt: participant.lastSeen || new Date(0) },
                  senderId: { $ne: participant.userId._id },
                });

          io.to(participant.userId._id.toString()).emit("chat-update", {
            chatId,
            updatedChat: {
              ...updatedChat,
              unseenCount,
            },
          });
        },
      ),
    );
    const response: ApiResponse<IMessage> = {
      success: true,
      data: newMessage,
      message: "message sent",
    };

    res.status(200).json(response);
    if (filteredParticipants[0].userId.botOn) {
      const aiResponse = await generateAiReply(
        chatId,
        filteredParticipants[0].userId._id,
        message,
      );

      if (!aiResponse.error && aiResponse.message) {
        const aiMessage = await Message.create({
          senderId: filteredParticipants[0].userId._id,
          text: aiResponse.message,
          chatId,
        });
        const aiUpdatedChat = await Chat.findByIdAndUpdate(
          chatId,
          {
            $set: { lastMessage: aiMessage._id, lastMessageAt: new Date() },
          },
          { returnDocument: "after" },
        )
          .populate("lastMessage")
          .populate("participants.userId", "_id fullName profilePic botOn")
          .lean();
        await Promise.all(
          aiUpdatedChat.participants.map(
            async (participant: {
              userId: { _id: string };
              lastSeen?: Date;
            }) => {
              const participantId = participant.userId._id.toString();
              const unseenCount =
                participantId === userId.toString()
                  ? 0
                  : await Message.countDocuments({
                      chatId,
                      createdAt: { $gt: participant.lastSeen || new Date(0) },
                      senderId: { $ne: participant.userId._id },
                    });

              io.to(participant.userId._id.toString()).emit("chat-update", {
                chatId,
                updatedChat: {
                  ...aiUpdatedChat,
                  unseenCount,
                },
              });
            },
          ),
        );
        io.to(chatId).emit("receive-message", { message: aiMessage });
      }
    }
  },
);
export const unsendMessage = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user._id;
    const messageId = req.query._id;

    const message = await Message.findById(messageId).lean();

    if (!message) throw new AppError("Message not found", 404);
    if (message.senderId.toString() !== userId.toString()) {
      throw new AppError("You are not the owner of this message", 403);
    }
    const lastMessage = await Message.findOne({
      chatId: message.chatId,
      _id: { $ne: message._id },
    })
      .sort({ createdAt: -1 })
      .lean();
    const updatedChat = await Chat.findByIdAndUpdate(
      message.chatId,
      {
        $set: {
          lastMessage: lastMessage?._id || null,
          lastMessageAt: lastMessage ? lastMessage.createdAt : null,
        },
      },
      { returnDocument: "after" },
    )
      .populate("lastMessage")
      .populate("participants.userId", "_id fullName profilePic")
      .lean();
    updatedChat.participants.forEach(
      (participant: { userId: { _id: string } }) => {
        io.to(participant.userId._id.toString()).emit("message-unsend", {
          chatId: lastMessage.chatId,
          updatedChat,
        });
      },
    );
    await Message.deleteOne({ _id: messageId });
    io.to(message.chatId.toString()).emit("message-unsent", {
      messageId,
    });
    const response: ApiResponse<null> = {
      success: true,
      data: message._id,
      message: "Message deleted",
    };
    res.status(200).json(response);
  },
);
