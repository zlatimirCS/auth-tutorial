import express from "express";
import { signup, verifyEmail } from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);

router.get("/login", (req, res) => {
  res.send("login route");
});

export default router;
