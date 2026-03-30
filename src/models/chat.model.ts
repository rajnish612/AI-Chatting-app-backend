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
type Participant = {
  userId: mongoose.Types.ObjectId;
  lastSeen: Date;
};
export interface IChat {
  _id: mongoose.Types.ObjectId;
  participants: Participant[];
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
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          index: true,
        },
        lastSeen: {
          type: Date,
          default: new Date(0),
        },
      },
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
