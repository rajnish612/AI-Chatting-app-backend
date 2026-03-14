import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { getChats } from "../controllers/chat.controller";
const router = express.Router();

router.get("/get-chats", verifyToken, getChats);
export default router;
