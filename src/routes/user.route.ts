import express from "express";
import { verifyToken } from "../middleware/auth.middleware";
import { getUser } from "../controllers/user.controller";
const router = express.Router();

router.route("/:_id").get(verifyToken, getUser);
export default router;
