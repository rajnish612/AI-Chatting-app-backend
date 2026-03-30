import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getChats,
  getParticipants,
  updateLastSeen,
} from "../controllers/chat.controller";
const router = express.Router();

router.get("/get-chats", verifyToken, getChats);
router.patch("/update-lastseen", verifyToken, updateLastSeen);
router.get("/get-participants", verifyToken, getParticipants);
export default router;
