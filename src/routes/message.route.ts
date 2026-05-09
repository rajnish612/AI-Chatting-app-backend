import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  getMessages,
  sendTextMessage,
  unsendMessage,
  sendImageMessage,
} from "../controllers/message.controller";
import { getSharedMedia } from "../controllers/message.controller";
const router = express.Router();
const sendRouter = express.Router();
router.use("/send", sendRouter);

router.route("/get-messages").get(verifyToken, getMessages);
router.route("/shared-media").get(verifyToken, getSharedMedia);
router.route("/unsend").post(verifyToken, unsendMessage);

sendRouter.route("/text-message").post(verifyToken, sendTextMessage);
sendRouter.route("/image-message").post(verifyToken, sendImageMessage);
export default router;
