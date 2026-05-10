import "dotenv/config";
import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
import Chat from "../models/chat.model";
const app = express();
const server = createServer(app);
const onlineUserCounts = new Map<string, number>();

export const isUserOnline = (userId: string) => onlineUserCounts.has(userId);

const setUserOnline = (userId: string) => {
  const currentCount = onlineUserCounts.get(userId) || 0;
  onlineUserCounts.set(userId, currentCount + 1);
};

const setUserOffline = (userId: string) => {
  const currentCount = onlineUserCounts.get(userId) || 0;
  if (currentCount <= 1) {
    onlineUserCounts.delete(userId);
    return;
  }
  onlineUserCounts.set(userId, currentCount - 1);
};

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URI,
    credentials: true,
  },
});
io.on("connection", (socket) => {
  socket.on("join", ({ _id }) => {
    socket.data.userId = _id;
    socket.join(_id);
    setUserOnline(_id);
    socket.emit("online-users", Array.from(onlineUserCounts.keys()));
    io.emit("presence-update", { userId: _id, isOnline: true });
  });
  socket.on("join-chat", ({ chatId }) => {
    socket.join(chatId);
  });
  socket.on("send-message", async ({ chatId, message }) => {
    socket.to(chatId).emit("receive-message", { message });
  });
  socket.on("call-end", ({ to, reason }) => {
    if (!to) return;
    io.to(to).emit("call-end", {
      from: socket.data.userId,
      reason: reason || "ended",
    });
  });
  socket.on("disconnect", () => {
    const userId = socket.data.userId;
    if (!userId) return;
    setUserOffline(userId);
    io.emit("presence-update", { userId, isOnline: false });
  });
});
export { app, server, io };
