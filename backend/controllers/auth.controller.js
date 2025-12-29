import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendResetSuccessEmail,
  sendPasswordResetEmail,
} from "../mailtrap/email.js";
import { getLanguage, translate } from "../utils/translations.js";
import crypto from "crypto";

export const login = async (req, res) => {
  // Get language from Accept-Language header
  const lang = getLanguage(req.headers["accept-language"]);
  if (!req.body) {
    return res.status(400).json({
      success: false,
      message: translate(lang, "login", "fill_all_fields"),
    });
  }
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: translate(lang, "login", "fill_all_fields"),
      });
    }
    const userFound = await User.findOne({ email });
    console.log("userFound:", userFound);
    if (!userFound) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }
    const isPasswordValid = await bcryptjs.compare(
      password,
      userFound.password
    );
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }
    const isVerified = userFound.isVerified;
    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: translate(lang, "login", "verify_email_first"),
      });
    }

    generateTokenAndSetCookie(res, userFound._id);

    userFound.lastLogin = new Date();

    await userFound.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...userFound._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const signup = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all the fields" });
    }
    const userAlreadyExist = await User.findOne({ email });

    if (userAlreadyExist) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const newPassword = await bcryptjs.hash(password, 10);
    const verificationToken = generateVerificationToken();
    const newUser = new User({
      name,
      email,
      password: newPassword,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
    await newUser.save();

    // jwt
    generateTokenAndSetCookie(res, newUser._id);

    await sendVerificationEmail(newUser.email, verificationToken);
    return res.status(201).json({
      success: true,
      message: "User created",
      user: {
        ...newUser._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("Error in signup:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { verificationToken } = req.body;
  try {
    if (!verificationToken) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all the fields" });
    }

    const userFound = await User.findOne({ verificationToken });
    const { verificationTokenExpiresAt } = userFound;

    if (!userFound) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid verification token" });
    }

    if (verificationTokenExpiresAt < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Verification token expired" });
    }

    userFound.isVerified = true;
    userFound.verificationToken = undefined;
    userFound.verificationTokenExpiresAt = undefined;

    await userFound.save();

    await sendWelcomeEmail(userFound?.email, userFound?.name);

    return res
      .status(200)
      .json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  try {
    // Get language from Accept-Language header
    const lang = getLanguage(req.headers["accept-language"]);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    return res.status(200).json({
      success: true,
      message: translate(lang, "logout", "success"),
    });
  } catch (error) {
    const lang = getLanguage(req.headers["accept-language"]);
    console.error("Error in logout:", error);
    return res.status(500).json({
      success: false,
      message: translate(lang, "logout", "error"),
    });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    }
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpiresAt = resetTokenExpiresAt;

    await user.save();
    console.log("user email", user.email);

    await sendPasswordResetEmail(
      user.email,
      `http://localhost:3000/reset-password/${resetToken}`
    );
    res.status(200).json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("something went wrong");
    res.status(400).json({
      success: false,
      message: error?.message || "something went wrong",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordTokenExpiresAt: { $gt: Date.now() },
    });
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired reset token" });
    }
    // update password
    const hashedPassword = await bcryptjs.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordTokenExpiresAt = undefined;
    await user.save();

    await sendResetSuccessEmail(user?.email);
    res
      .status(200)
      .json({ success: true, message: "Password reset successfuly" });
  } catch (error) {
    console.error("something went wrong");
    res.status(400).json({ success: false, message: "reset password failed" });
  }
};

export const checkAuth = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "user not found" });
    }

    res.status(200).json({
      success: true,
      user: {
        ...user?._doc,
        password: undefined,
      },
    });
  } catch (error) {
    console.error("something went wrong");
  }
};
