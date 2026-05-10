import express from "express";
import {
  checkAuth,
  signIn,
  signOut,
  signUp,
  updateProfile,
  verifyOtp,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  sendEmailVerificationOtp,
  verifyAndUpdateEmail,
  sendDeleteAccountOtp,
  verifyDeleteAccount,
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = express.Router();

router.post("/sign-up", signUp);
router.post("/verify-otp", verifyOtp);
router.post("/sign-in", signIn);
router.get("/check-auth", verifyToken, checkAuth);
router.get("/sign-out", signOut);
router.put("/update-profile", verifyToken, updateProfile);
router.put("/update-user-profile", verifyToken, updateUserProfile);
router.put("/change-password", verifyToken, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/send-email-verification-otp", verifyToken, sendEmailVerificationOtp);
router.post("/verify-and-update-email", verifyToken, verifyAndUpdateEmail);
router.post("/send-delete-account-otp", verifyToken, sendDeleteAccountOtp);
router.post("/verify-delete-account", verifyToken, verifyDeleteAccount);
export default router;
