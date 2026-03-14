import mongoose from "mongoose";
enum ChatType {
  PRIVATE = "private",
  GROUP = "group",
}
enum LastMessageType {
  AUDIO = "audio",
  IMAGE = "image",
  VIDEO = "video",
  TEXT = "text",
}
export interface IChat {
  participants: Array<mongoose.Schema.Types.ObjectId>;
  lastMessage: string;
  lastMessageType: LastMessageType;
  type: ChatType;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
}
const chatSchema = new mongoose.Schema<IChat>(
  {
    name: { type: String, default: "" },
    participants: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    ],
    lastMessageType: {
      type: String,
      enum: Object.values(LastMessageType),
    },

    type: {
      type: String,
      enum: Object.values(ChatType),
    },
  },

  { timestamps: true },
);
const Chat = mongoose.models.Chats || mongoose.model("Chats", chatSchema);
export default Chat;
