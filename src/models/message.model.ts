import mongoose from "mongoose";
interface IMessage {
  _id: mongoose.Schema.Types.ObjectId;
  senderId: mongoose.Schema.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  text: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}
const messageSchema = new mongoose.Schema<IMessage>(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
