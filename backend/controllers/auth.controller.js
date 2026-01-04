import User from "../models/user.model.js";
import Person from "../models/person.model.js";
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
      `http://localhost:5137/reset-password/${resetToken}`
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

// export const getPersons = async (req, res) => {
//   try {
//     const { favoriteFruit } = req.query;
//     const pipeline = [];
//     const matchStage = {};
//     if (favoriteFruit) {
//       matchStage.favoriteFruit = favoriteFruit;
//     }
//     if (Object.keys(matchStage).length) {
//       pipeline.push({ $match: matchStage });
//     }
//     if (!pipeline.length) {
//       pipeline.push({ $match: {} });
//     }
//     const persons = await Person.aggregate(pipeline);
//     res.status(200).json({ success: true, persons });
//   } catch (error) {
//     console.error("Error in getPersons:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// get persons with filtering , pagination, sorting, total count
// export const getPersons = async (req, res) => {
//   try {
//     const {
//       favoriteFruit,
//       page = 1,
//       limit = 2,
//       sortBy = "name",
//       order = "asc",
//     } = req.query;
//     const pipeline = [];
//     const matchStage = {};
//     if (favoriteFruit) {
//       matchStage.favoriteFruit = favoriteFruit;
//     }
//     if (Object.keys(matchStage).length) {
//       pipeline.push({ $match: matchStage });
//     }
//     if (!pipeline.length) {
//       pipeline.push({ $match: {} });
//     }

//     // Sorting
//     const sortOrder = order === "asc" ? 1 : -1;
//     const sortStage = { $sort: { [sortBy]: sortOrder } };
//     pipeline.push(sortStage);

//     // Pagination
//     const skip = (page - 1) * limit;
//     pipeline.push({ $skip: parseInt(skip) });
//     pipeline.push({ $limit: parseInt(limit) });

//     // Total count
//     const countPipeline = [...pipeline];
//     countPipeline.push({ $count: "total" });
//     const countResult = await Person.aggregate(countPipeline);
//     const totalCount = countResult[0] ? countResult[0].total : 0;

//     // current page persons
//     const currentPage = parseInt(page);

//     const persons = await Person.aggregate(pipeline);
//     res.status(200).json({ success: true, persons, totalCount, currentPage });
//   } catch (error) {
//     console.error("Error in getPersons:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

// export const getPersons = async (req, res) => {
//   try {
//     const {
//       favoriteFruit,
//       page = 1,
//       limit = 10,
//       sortBy = "registered",
//       order = "asc",
//     } = req.query;
//     const pipeline = [];
//     const matchStage = {};
//     if (favoriteFruit) {
//       matchStage.favoriteFruit = favoriteFruit;
//     }
//     if (Object.keys(matchStage).length) {
//       pipeline.push({ $match: matchStage });
//     }
//     if (!pipeline.length) {
//       pipeline.push({ $match: {} });
//     }

//     // Sorting
//     const sortOrder = order === "asc" ? 1 : -1;
//     const sortStage = { $sort: { [sortBy]: sortOrder } };
//     pipeline.push(sortStage);

//     // Total count
//     const countPipeline = [...pipeline];
//     countPipeline.push({ $count: "total" });
//     const countResult = await Person.aggregate(countPipeline);
//     const totalCount = countResult[0] ? countResult[0].total : 0;

//     // Pagination
//     const skip = (page - 1) * limit;
//     pipeline.push({ $skip: parseInt(skip) });
//     pipeline.push({ $limit: parseInt(limit) });

//     // current page persons
//     const currentPage = parseInt(page);

//     // add project stage
//     pipeline.push({
//       $project: {
//         index: 1,
//         name: 1,
//         age: 1,
//         gender: 1,
//         eyeColor: 1,
//         favoriteFruit: 1,
//         isActive: 1,
//         registeredDate: "$registered",
//         companyDetails: {
//           jobTitle: "$company.title",
//           companyEmail: "$company.email",
//           phone: "$company.phone",
//           location: "$company.location",
//         },
//         tags: 1,
//         createdAt: 1,
//         updatedAt: 1,
//       },
//     });

//     const persons = await Person.aggregate(pipeline);
//     res.status(200).json({ success: true, persons, totalCount, currentPage });
//   } catch (error) {
//     console.error("Error in getPersons:", error);
//     return res
//       .status(500)
//       .json({ success: false, message: "Internal server error" });
//   }
// };

export const getPersons = async (req, res) => {
  try {
    const {
      favoriteFruit,
      page = 1,
      limit = 2,
      sortBy = "registered",
      order = "asc",
    } = req.query;

    // Build initial match stage
    const matchStage = {};
    if (favoriteFruit) {
      matchStage.favoriteFruit = favoriteFruit;
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;
    const currentPage = parseInt(page);

    // Single query with $facet - runs multiple pipelines in parallel
    const pipeline = [
      { $match: Object.keys(matchStage).length ? matchStage : {} },
      {
        $facet: {
          // Get total count without pagination
          metadata: [
            { $count: "total" },
            {
              $addFields: {
                page: currentPage,
                limit: parseInt(limit),
              },
            },
          ],
          // Get paginated and sorted persons
          data: [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) },
            {
              $project: {
                index: 1,
                name: 1,
                age: 1,
                gender: 1,
                eyeColor: 1,
                favoriteFruit: 1,
                isActive: 1,
                registeredDate: "$registered",
                companyDetails: {
                  jobTitle: "$company.title",
                  companyEmail: "$company.email",
                  phone: "$company.phone",
                  location: "$company.location",
                },
                tags: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          // Age distribution using $bucket
          ageDistribution: [
            {
              $bucket: {
                groupBy: "$age",
                boundaries: [0, 20, 30, 40, 50, 60, 100],
                default: "unknown",
                output: {
                  count: { $sum: 1 },
                  names: {
                    $push: {
                      name: "$name",
                      age: "$age",
                    },
                  },
                },
              },
            },
          ],
          // Gender breakdown
          genderStats: [
            {
              $group: {
                _id: "$gender",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
        },
      },
    ];

    const result = await Person.aggregate(pipeline);

    // Extract data from facet results
    const { data, metadata, ageDistribution, genderStats } = result[0];
    const totalCount = metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      persons: data,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
      stats: {
        ageDistribution,
        genderStats,
      },
    });
  } catch (error) {
    console.error("Error in getPersons:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

export const getPersonsCopy = async (req, res) => {
  try {
    const {
      favoriteFruit,
      searchTerm,
      tags,
      page = 1,
      limit = 2,
      sortBy = "registered",
      order = "asc",
    } = req.query;

    // Build initial match stage
    const matchStage = {};
    if (favoriteFruit) {
      matchStage.favoriteFruit = favoriteFruit;
    }

    // Add tags filter - match documents with ANY of the specified tags
    if (tags) {
      const tagsArray = Array.isArray(tags) ? tags : tags.split(",");
      matchStage.tags = { $in: tagsArray };
    }

    // Add search term for name and company.email
    if (searchTerm) {
      matchStage.$or = [
        { name: { $regex: searchTerm, $options: "i" } }, // Case-insensitive search in name
        { "company.email": { $regex: searchTerm, $options: "i" } }, // Case-insensitive search in company email
      ];
    }

    const sortOrder = order === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;
    const currentPage = parseInt(page);

    // Single query with $facet - runs multiple pipelines in parallel
    const pipeline = [
      { $match: Object.keys(matchStage).length ? matchStage : {} },
      {
        $facet: {
          // Get total count without pagination
          metadata: [
            { $count: "total" },
            {
              $addFields: {
                page: currentPage,
                limit: parseInt(limit),
              },
            },
          ],
          // Get paginated and sorted persons
          data: [
            { $sort: { [sortBy]: sortOrder } },
            { $skip: parseInt(skip) },
            { $limit: parseInt(limit) },
            {
              $project: {
                index: 1,
                name: 1,
                age: 1,
                gender: 1,
                eyeColor: 1,
                favoriteFruit: 1,
                isActive: 1,
                registeredDate: "$registered",
                companyDetails: {
                  jobTitle: "$company.title",
                  companyEmail: "$company.email",
                  phone: "$company.phone",
                  location: "$company.location",
                },
                tags: 1,
                createdAt: 1,
                updatedAt: 1,
              },
            },
          ],
          // Age distribution using $bucket
          ageDistribution: [
            {
              $bucket: {
                groupBy: "$age",
                boundaries: [0, 20, 30, 40, 50, 60, 100],
                default: "unknown",
                output: {
                  count: { $sum: 1 },
                  names: {
                    $push: {
                      name: "$name",
                      age: "$age",
                    },
                  },
                },
              },
            },
          ],
          // Gender breakdown
          genderStats: [
            {
              $group: {
                _id: "$gender",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
        },
      },
    ];

    const result = await Person.aggregate(pipeline);

    // Extract data from facet results
    const { data, metadata, ageDistribution, genderStats } = result[0];
    const totalCount = metadata[0]?.total || 0;

    res.status(200).json({
      success: true,
      persons: data,
      pagination: {
        total: totalCount,
        page: currentPage,
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
      stats: {
        ageDistribution,
        genderStats,
      },
      searchApplied: !!searchTerm,
    });
  } catch (error) {
    console.error("Error in getPersonsCopy:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
