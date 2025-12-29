import express from "express";
import {
  signup,
  verifyEmail,
  logout,
  login,
  forgotPassword,
  resetPassword,
  checkAuth,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("check-auth", verifyToken, checkAuth);

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.post("/login", login);

export default router;
