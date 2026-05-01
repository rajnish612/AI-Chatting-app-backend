import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  createOrGetPrivateChat,
  deleteChat,
  getChats,
  getParticipants,
  searchChats,
  updateLastSeen,
} from "../controllers/chat.controller";
const router = express.Router();

router.get("/get-chats", verifyToken, getChats);
router.get("/search-chats", verifyToken, searchChats);
router.delete("/delete-chat", verifyToken, deleteChat);
router.get("/create-or-get-private-chat", verifyToken, createOrGetPrivateChat);
router.patch("/update-lastseen", verifyToken, updateLastSeen);
router.get("/get-participants", verifyToken, getParticipants);
export default router;
