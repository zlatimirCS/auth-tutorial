import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail } from "../mailtrap/email.js";

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
