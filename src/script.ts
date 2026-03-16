import { connectDb } from "./lib/db";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/user.model";
import Chat from "./models/chat.model";
dotenv.config();
connectDb();
export const fetchSelf = async () => {
  const self = await User.findOne();
};

export const createUser = async (
  fullName: string,
  email: string,
  password: string,
) => {
  const salt = await bcrypt.genSalt(10);
  const user = await User.create({
    fullName,
    email,
    password: await bcrypt.hash(password, salt),
  });
  console.log("user created", user);
};
export const createChat = async (
  participants: string[],
  lastMessage: string,
  type: string,
  lastMessageType: string,
) => {
  const chat = await Chat.create({
    participants,
    lastMessage,
    type,
    lastMessageType,
  });
};
