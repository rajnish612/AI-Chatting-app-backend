import mongoose from "mongoose";
export interface IMessage {
  _id: mongoose.Schema.Types.ObjectId;
  senderId: mongoose.Schema.Types.ObjectId;
  receiver: mongoose.Types.ObjectId[];
  text: string;
  type: "text" | "image" | "video" | "audio";
  image: string;
  createdAt: Date;
  updatedAt: Date;
  chatId: mongoose.Schema.Types.ObjectId;
  seenBy?: mongoose.Schema.Types.ObjectId[];
}
const messageSchema = new mongoose.Schema<IMessage>(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chats" },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "audio"],
      default: "text",
    },
    seenBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    text: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
export default Message;
