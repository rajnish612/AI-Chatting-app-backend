import mongoose from "mongoose";
enum ChatType {
  PRIVATE = "private",
  GROUP = "group",
}

type Participant = {
  userId: mongoose.Types.ObjectId;
  lastSeen: Date;
};
export interface IChat {
  _id: mongoose.Types.ObjectId;
  participants: Participant[];
  lastMessage: {
    _id: mongoose.Types.ObjectId;
    text: string;
    senderId: mongoose.Types.ObjectId;
    createdAt: Date;
  };
  lastMessageAt: Date;
  type: ChatType;
  deletedFor: { userId: mongoose.Types.ObjectId; deletedAt: Date }[];
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
    lastMessageAt: { type: Date, default: null },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(ChatType),
    },
    deletedFor: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        deletedAt: {
          type: Date,
          default: null,
        },
      },
    ],
  },

  { timestamps: true },
);
const Chat = mongoose.models.Chats || mongoose.model("Chats", chatSchema);
export default Chat;
