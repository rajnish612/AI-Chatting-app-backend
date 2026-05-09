import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { getAllUsers, getUser, updateBotStatus } from "../controllers/user.controller";
const router = express.Router();

router.route("/:_id").get(verifyToken, getUser);
router.get("/", verifyToken, getAllUsers);
router.put("/bot", verifyToken, updateBotStatus);
export default router;
