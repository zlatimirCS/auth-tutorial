import express from "express";
import {
  signup,
  verifyEmail,
  logout,
  login,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/logout", logout);

router.get("/login", login);

export default router;
