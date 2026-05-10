import nodemailer from "nodemailer";
import AppError from "./AppError";

type SendOtpOptions = {
  subject?: string;
  introText?: string;
};

export const sendOtp = async (
  email: string,
  otp: string,
  options?: SendOtpOptions,
): Promise<boolean> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new AppError("Email service not configured", 500);
    }

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Chatting App'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: options?.subject || "Your OTP for Sign Up",
      text: `${options?.introText || "Your OTP is"}: ${otp}. This code will expire in 5 minutes.`,
      html: `<p>${options?.introText || "Your OTP is"}: <strong>${otp}</strong></p><p>This code will expire in 5 minutes.</p><p>If you did not request this, please ignore this email.</p>`,
    });

    
    return true;
  } catch (err) {
    
    return false;
  }
};
