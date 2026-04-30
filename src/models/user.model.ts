import mongoose from "mongoose";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  fullName: String;
  password: String;
  email: String;
  profilePic?: String;
  createdAt: Date;
  UpdatedAt: Date;
}
const userSchema = new mongoose.Schema<IUser>(
  {
    fullName: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    profilePic: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
