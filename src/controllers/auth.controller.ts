import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import AppError from "../lib/AppError";
import User from "../models/user.model";
import OTP from "../models/otp.model";
import bcrypt from "bcryptjs";
import { generateToken, generateOTP } from "../lib/utils";
import { sendOtp } from "../lib/NodeMailer";
import cloudinary from "../lib/cloudinary";
export const checkAuth = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    message: "successfully fetched your profile",
    data: req.user,
    success: true,
  });
});
export const signUp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body?.fullName || !req.body?.email || !req.body?.password)
    throw new AppError("All the credentials are required", 400);
  const {
    fullName,
    email,
    password,
  }: { fullName: string; email: string; password: string } = req.body;

  if (password.length < 6)
    throw new AppError("Password must be length of min 6 characters", 400);

  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    await User.deleteOne({ _id: existingUser._id });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const otpCode = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

  await OTP.deleteOne({ email });

  await OTP.create({
    email,
    otp: otpCode,
    expiresAt,
  });

  const newUser = new User({
    fullName,
    email,
    password: passwordHash,
  });

  await newUser.save();

  const emailSent = await sendOtp(email, otpCode);
  if (!emailSent) {
    await User.deleteOne({ _id: newUser._id });
    await OTP.deleteOne({ email });
    throw new AppError("Failed to send OTP. Please try again.", 500);
  }

  console.log(`[Auth] Sign-Up OTP sent for user: ${newUser._id}`);
  res.status(201).json({
    message: "OTP sent to your email. Please verify to complete signup.",
    email: newUser.email,
    success: true,
  });
});

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("email", email, "password", password);

  if (!email || !password)
    throw new AppError("email and password is required", 400);
  const user = await User.findOne({ email: email });

  if (!user) throw new AppError("User not found", 400);
  const passwordMatched = await bcrypt.compare(password, user.password);
  if (!passwordMatched) throw new AppError("password is wrong", 400);
  console.log(`[Auth] Sign-In successful for user: ${user._id}`);
  const token = generateToken({ userId: user._id, email });
  console.log(`[Auth] Sign-In response prepared, sending user data with token`);
  res.status(200).json({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    token,
    success: true,
  });
});

export const signOut = asyncHandler(async (req: Request, res: Response) => {
  res.json({ message: "Sign out successful", success: true });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp }: { email: string; otp: string } = req.body;

  if (!email || !otp) throw new AppError("Email and OTP are required", 400);

  // Check OTP validity
  const otpRecord = await OTP.findOne({ email });

  if (!otpRecord)
    throw new AppError("OTP not found. Please sign up again.", 400);

  if (new Date() > otpRecord.expiresAt)
    throw new AppError("OTP has expired. Please sign up again.", 400);

  if (otpRecord.otp !== otp) throw new AppError("Invalid OTP", 400);

  // OTP verified, delete OTP record
  await OTP.deleteOne({ _id: otpRecord._id });

  // Fetch user and generate auth token
  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  const token = generateToken({ userId: user._id.toString(), email });

  console.log(`[Auth] Sign-Up verified for user: ${user._id}`);
  res.status(200).json({
    message: "Email verified successfully",
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    profilePic: user.profilePic,
    token,
    success: true,
  });
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { profilePic } = req.body;
    const userId = req.user._id;
    if (!profilePic) {
      throw new AppError("Profile pic is required", 401);
    }
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profilePic: uploadResponse.secure_url,
      },
      { new: true },
    ).select("-password");
    res.status(201).json({
      message: "Profile pic updated successfully",
      data: updatedUser,
      sucess: true,
    });
  },
);
