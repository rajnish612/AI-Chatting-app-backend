import mongoose from "mongoose";
export const connectDb = async () => {
  const MONGODB_URI: string | undefined = process.env.MONGODB_URI;

  if (!MONGODB_URI) throw new Error("mongo-db connection string is undefined");
  try {
    const conn = await mongoose.connect(MONGODB_URI);
  } catch (err) {
    throw new Error(err);
  }
};
