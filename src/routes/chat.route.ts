import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getChats,
  getParticipants,
  getUnseenCount,
} from "../controllers/chat.controller";
const router = express.Router();

router.get("/get-chats", verifyToken, getChats);
router.get("/get-participants", verifyToken, getParticipants);
router.get("/unseen-count", verifyToken, getUnseenCount);
export default router;
