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

  const existingOTP = await OTP.findOne({ email });
  let otpCode: string;
  let expiresAt: Date;

  if (existingOTP && new Date() < existingOTP.expiresAt) {
    otpCode = existingOTP.otp;
    expiresAt = existingOTP.expiresAt;
  } else {
    otpCode = generateOTP();
    expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteOne({ email });

    await OTP.create({
      email,
      otp: otpCode,
      expiresAt,
    });
  }

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

  
  res.status(201).json({
    message: "OTP sent to your email. Please verify to complete signup.",
    email: newUser.email,
    success: true,
  });
});

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  

  if (!email || !password)
    throw new AppError("email and password is required", 400);
  const user = await User.findOne({ email: email });

  if (!user) throw new AppError("User not found", 400);
  const passwordMatched = await bcrypt.compare(password, user.password);
  if (!passwordMatched) throw new AppError("password is wrong", 400);
  
  const token = generateToken({ userId: user._id, email });
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

export const updateUserProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { fullName, email, profilePic } = req.body;
    const userId = req.user._id;

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;

    if (profilePic && profilePic !== "") {
      const uploadResponse = await cloudinary.uploader.upload(profilePic);
      updateData.profilePic = uploadResponse.secure_url;
    } else if (profilePic === "") {
      // Explicitly clear profile picture
      updateData.profilePic = "";
    }

    if (Object.keys(updateData).length === 0) {
      throw new AppError("At least one field is required to update", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    }).select("-password");

    res.status(200).json({
      message: "Profile updated successfully",
      data: updatedUser,
      success: true,
    });
  },
);

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, oldPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!oldPassword || !newPassword) {
      throw new AppError("Old password and new password are required", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("New password must be at least 6 characters", 400);
    }

    const user = await User.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const passwordMatched = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatched)
      throw new AppError("Old password is incorrect", 400);

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { password: newPasswordHash },
      { new: true },
    ).select("-password");

    
    res.status(200).json({
      message: "Password changed successfully",
      data: updatedUser,
      success: true,
    });
  },
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) throw new AppError("Email is required", 400);

    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await OTP.deleteOne({ email });
    
    
    await OTP.create({
      email,
      otp: otpCode,
      expiresAt,
    });

    const emailSent = await sendOtp(email, otpCode);
    if (!emailSent) {
      await OTP.deleteOne({ email });
      throw new AppError("Failed to send OTP. Please try again.", 500);
    }

    
    res.status(200).json({
      message: "OTP sent to your email for password reset",
      email,
      success: true,
    });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      throw new AppError("Email, OTP, and new password are required", 400);
    }

    if (newPassword.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }

    // Verify OTP
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord)
      throw new AppError("OTP not found. Please request a new one.", 400);

    if (new Date() > otpRecord.expiresAt)
      throw new AppError("OTP has expired. Please request a new one.", 400);

    if (otpRecord.otp !== otp) throw new AppError("Invalid OTP", 400);

    // Find user and reset password
    const user = await User.findOne({ email });
    if (!user) throw new AppError("User not found", 404);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(user._id, { password: passwordHash });
    await OTP.deleteOne({ _id: otpRecord._id });

    
    res.status(200).json({
      message: "Password reset successfully",
      success: true,
    });
  },
);

export const sendEmailVerificationOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { newEmail } = req.body;
    const userId = req.user._id;

    if (!newEmail) throw new AppError("New email is required", 400);

    // Check if new email is already in use
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      throw new AppError("Email already in use", 400);
    }

    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.deleteOne({ email: newEmail });
    
    await OTP.create({
      email: newEmail,
      otp: otpCode,
      expiresAt,
    });

    const emailSent = await sendOtp(newEmail, otpCode);
    if (!emailSent) {
      await OTP.deleteOne({ email: newEmail });
      throw new AppError("Failed to send OTP. Please try again.", 500);
    }

    
    res.status(200).json({
      message: "OTP sent to your new email address",
      email: newEmail,
      success: true,
    });
  },
);

export const verifyAndUpdateEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { newEmail, otp } = req.body;
    const userId = req.user._id;

    if (!newEmail || !otp) {
      throw new AppError("New email and OTP are required", 400);
    }

    const otpRecord = await OTP.findOne({ email: newEmail });
    if (!otpRecord)
      throw new AppError("OTP not found. Please request a new one.", 400);

    if (new Date() > otpRecord.expiresAt)
      throw new AppError("OTP has expired. Please request a new one.", 400);

    if (otpRecord.otp !== otp) throw new AppError("Invalid OTP", 400);

    
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { email: newEmail },
      { new: true },
    ).select("-password");

    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      message: "Email updated successfully",
      data: updatedUser,
      success: true,
    });
  },
);
