import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import {
  checkSeen,
  getMessages,
  seeMessage,
  sendTextMessage,
} from "../controllers/message.controller";
const router = express.Router();
const sendRouter = express.Router();
router.use("/send", sendRouter);

router.route("/get-messages").get(verifyToken, getMessages);
router.route("/see-messages").patch(verifyToken, seeMessage);
router.route("/check-seen").post(verifyToken, checkSeen);
sendRouter.route("/text-message").post(verifyToken, sendTextMessage);
export default router;
