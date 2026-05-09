import express from "express";
import {
  checkAuth,
  signIn,
  signOut,
  signUp,
  updateProfile,
  verifyOtp,
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = express.Router();

router.post("/sign-up", signUp);
router.post("/verify-otp", verifyOtp);
router.post("/sign-in", signIn);
router.get("/check-auth", verifyToken, checkAuth);
router.get("/sign-out", signOut);
router.put("/update-profile", verifyToken, updateProfile);
export default router;
