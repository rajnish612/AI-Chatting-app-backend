import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import AppError from "../lib/AppError";
import User from "../models/user.model";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils";
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
  const user = await User.findOne({ email: email });
  if (user) throw new AppError("Email already exists.", 400);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const newUser = new User({
    fullName,
    email,
    password: passwordHash,
  });
  if (newUser) {
    await newUser.save();

    const token = generateToken({ userId: newUser._id, email });
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
      token,
      success: true,
    });
  } else {
    throw new AppError("Unable to create account", 400);
  }
});

export const signIn = asyncHandler(async (req: Request, res: Response) => {

  const { email, password } = req.body;
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
  // Token-based auth: client removes token from localStorage
  // No server-side state to clear
  console.log(`[Auth] Sign-Out for user: ${req.user?._id}`);
  res.json({ message: "Sign out successful", success: true });
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
