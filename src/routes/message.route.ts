import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getMessages,
  sendTextMessage,
  unsendMessage,
} from "../controllers/message.controller";
const router = express.Router();
const sendRouter = express.Router();
router.use("/send", sendRouter);

router.route("/get-messages").get(verifyToken, getMessages);
router.route("/unsend").post(verifyToken, unsendMessage);

sendRouter.route("/text-message").post(verifyToken, sendTextMessage);
export default router;
