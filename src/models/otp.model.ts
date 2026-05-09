import mongoose from "mongoose";

export interface IOTP {
  _id: mongoose.Types.ObjectId;
  email: String;
  otp: String;
  expiresAt: Date;
  createdAt: Date;
}

const otpSchema = new mongoose.Schema<IOTP>(
  {
    email: { type: String, required: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  },
);

// TTL index: automatically delete OTP documents 5 minutes after expiresAt
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP = mongoose.models.OTP || mongoose.model("OTP", otpSchema);
export default OTP;
