import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { getChats } from "../controllers/message.controller";
const router = express.Router();

router.get("/chats", verifyToken, getChats);
export default router;
