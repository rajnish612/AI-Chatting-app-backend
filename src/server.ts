import express, { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import { connectDb } from "./lib/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import chatRoutes from "./routes/chat.route.js";
import userRoutes from "./routes/user.route.js";
import { app, io, server } from "./lib/socketInstance.js";
import messageRoutes from "./routes/message.route.js";
import { globalErrorHandler } from "./lib/globalErrorHandler.js";
dotenv.config();
const PORT = process.env.PORT;

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(globalErrorHandler);
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/user", userRoutes);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  res
    .status(statusCode)
    .json({ message: err.message || "Internal Server Error" });
});

server.listen(PORT, () => {
  console.log(`server running at port ${PORT}`);
  connectDb();
});
