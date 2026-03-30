import { Server } from "socket.io";
import { createServer } from "node:http";
import express from "express";
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: " http://localhost:5173",
    credentials: true,
  },
});
io.on("connection", (socket) => {
  socket.on("join", ({ _id }) => {
    socket.join(_id);
  });
  socket.on("join-chat", ({ chatId }) => {
    socket.join(chatId);
  });
  socket.on("send-message", ({ chatId, message, participants }) => {

    participants.forEach((participant: { userId: { _id: string } }) => {
      socket.to(participant.userId._id.toString()).emit("count-unseen", {
        chatId,
      });
    });
    socket.to(chatId).emit("receive-message", { message });
  });
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});
export { app, server, io };
