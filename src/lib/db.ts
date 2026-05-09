import mongoose from "mongoose";
export const connectDb = async () => {
  const MONGODB_URI: string | undefined = process.env.MONGODB_URI || "mongodb+srv://rnish612:VecHHXgflIL5GuZS@cluster0.mrfl8lg.mongodb.net/chatting-app";

  if (!MONGODB_URI) throw new Error("mongo-db connection string is undefined");
  try {
    const conn = await mongoose.connect(MONGODB_URI);
  } catch (err) {
    if (err instanceof Error) throw err;
    throw new Error(String(err));
  }
};
