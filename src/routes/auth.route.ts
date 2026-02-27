import express from "express";
import {
  signIn,
  signOut,
  signUp,
  updateProfile,
} from "../controllers/auth.controller";
import { verifyToken } from "../middleware/auth.middleware";
const router = express.Router();

router.post("/sign-up", signUp);
router.post("/sign-in", signIn);
router.get("/sign-out", signOut);
router.put("/update-profile", verifyToken, updateProfile);
export default router;
