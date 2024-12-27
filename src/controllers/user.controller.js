import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asynchandler from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { oldImageDelete } from "../utils/oldImageDelete.js";
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import excelJs from "exceljs";
import bcrypt from "bcrypt";
import fs from "fs";

const generateAccessTokenAndRefereshTokens = async (userId) => {
  // console.log("userId---", userId);
  try {
    const validUser = await User.findById(userId);
    // console.log("validUser", validUser);
    const accessToken = validUser.generateAccessToken();
    const refreshToken = validUser.generateRefreshToken();
    validUser.refreshToken = refreshToken;
    await validUser.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asynchandler(async (req, res) => {
  // get user details from frontend
  // validation-not all empty
  // check if user already exists :username,email
  // check for images,check avatar
  // upload them to cloudinary,avatar
  // create user object-create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return response

  const { fullname, email, username, password } = req.body;

  //check validation-not all empty
  if (
    [fullname, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new apiError(400, "All fields are required");
  }

  // check if user already exists :username,email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  //check for images,check avatar
  // const avatarLocalPath = req.files?.avatar[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files?.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files?.coverImage[0]?.path;
  }

  // if (!avatarLocalPath) {
  //   throw new apiError(400, "Avatar local file is required");
  // }

  // upload them to cloudinary,avatar
  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if (!avatar) {
  //   throw new apiError(400, "Avatar file is required");
  // }

  // create user object-create entry in db
  const user = await User.create({
    fullname,
    // avatar: avatar.url||"",
    // coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  // return response
  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asynchandler(async (req, res) => {
  //req body -> data
  const { email, username, password } = req.body;

  //username and email
  // console.log("req.body", req.body);
  if (!email && !username) {
    throw new apiError(400, "username or email is required");
  }

  //find the user
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User dose not exist");
  }

  //password check
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid user credentials");
  }

  //genrate access and refresh token
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefereshTokens(user._id);
  // console.log("accessToken, refreshToken", accessToken, refreshToken, user);
  //send cookies
  // remove password and refresh token field from response
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    //not modifiy from frontend
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged In SuccessFully"
      )
    );
});

const logoutUser = asynchandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new apiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefereshTokens(user._id);

    return res
      .status(200)
      .clearCookie("accessToken", accessToken, options)
      .clearCookie("refreshToken", newRefreshToken, options)
      .json(
        new apiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new apiError(401, error.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asynchandler(async (req, res) => {
  return res
    .status(200)
    .json(new apiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asynchandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new apiError(400, "All fields are required");
  }
  // console.log("req.body", req.body);
  // console.log("req.user", req.user);
  //find the user
  // const matchUserfullname = await User.exists({ fullname: fullname });
  const matchUserfullEmail = await User.exists({ email: email });
  // if (matchUserfullname) {
  //   throw new apiError(501, "Fullname already exist");
  // }
  if (matchUserfullEmail) {
    throw new apiError(501, "Email already exist");
  }
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "Account details updated successfully")
    );
});

const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar file is missing");
  }

  // Upload new avatar image
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new apiError(400, "Error while uploading avatar");
  }

  // Find user and get old avatar URL
  const user = await User.findById(req.user?._id);
  const oldAvatarUrl = user?.avatar;

  // Update user with new avatar URL
  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  if (!updatedUser) {
    throw new apiError(500, "Error updating user with new avatar");
  }
  // console.log("oldAvatarUrl", oldAvatarUrl);
  // Delete old avatar image from Cloudinary if it exists
  if (oldAvatarUrl) {
    const oldAvatarPublicId = oldAvatarUrl.split("/").pop().split(".")[0];
    // console.log("oldAvatarPublicId", oldAvatarPublicId);
    await oldImageDelete(oldAvatarPublicId);
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "Avatar image updated successfully")
    );
});

const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new apiError(400, "Cover image file is missing");
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url) {
    throw new apiError(400, "Error while uploading on avatar");
  }
  // Find user and get old avatar URL
  const getcoverImage = await User.findById(req.user?._id);
  const oldCoverImageUrl = getcoverImage?.coverImage;

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  // Delete old Cover image from Cloudinary if it exists
  if (oldCoverImageUrl) {
    const oldCoverImagePublicId = oldCoverImageUrl
      ?.split("/")
      .pop()
      .split(".")[0];
    await oldImageDelete(oldCoverImagePublicId);
  }
  return res
    .status(200)
    .json(new apiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannel = asynchandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }
  // - `$match` stage filters user by username.
  // - `$lookup` stages join with the "subscriptions" collection to get subscriber and subscription information.
  // - `$addFields` calculates the number of subscribers, the number of channels subscribed to, and checks if the current user is subscribed.
  // - `$project` stage specifies the fields to include in the final output
  const channel = await User.aggregate([
    // Match the user document based on the provided username
    { $match: { username: username?.toLowerCase() } },

    // Lookup to get all documents from the "subscriptions" collection where the channel field matches the user's _id
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    // Lookup to get all documents from the "subscriptions" collection where the subscriber field matches the user's _id
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscriberdTo",
      },
    },

    // Add new fields to the document
    {
      $addFields: {
        // Count the number of subscribers
        subscribersCount: {
          $size: "$subscribers",
        },
        // Count the number of channels the user is subscribed to
        channelsSubscriberdToCount: {
          $size: "$subscriberdTo",
        },
        // Check if the current user is subscribed to this channel
        isSubscriberd: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },

    // Project specific fields to include in the final result
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscriberdToCount: 1,
        isSubscriberd: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channel?.length) {
    throw new apiError(404, "Channel does not exist");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asynchandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

const forgetPassword = asynchandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new apiError(400, "Please provode email");

  const checkUserEmail = await User.findOne({ email });
  if (checkUserEmail) {
    await User.updateOne({ email }, { $set: { isResetTokenUsed: true } });
  } else {
    throw new apiError(400, "This email does not exists");
  }

  const token = jwt.sign({ email }, process.env.EMAIL_SECRET_KEY, {
    expiresIn: "1h",
  });
  // <a href="${process.env.CLIENT_URL}/reset-password/${token}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
  //   Reset Password
  // </a> //for postman
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });
  const mailOptions = {
    from: "webdisign@gmail.com",
    to: email,
    subject: "Password Reset Request",
    // text: `Click on this link to generate your new password ${process.env.CLIENT_URL}/reset-password/${token}`,
    html: `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to reset it:</p>
      <a href="http://localhost:3000/auth/resetPassword/${token}" target="_self" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
      <p>If you did not request a password reset, please ignore this email.</p>
      <p>Thank you!</p>
    `,
  };
  await transporter.sendMail(mailOptions);
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        {},
        "Password reset link send successfully on your gmail account"
      )
    );
});

const resetPassword = asynchandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    throw res.status(400).send({ message: "Please provide password" });
  }

  let decode;
  try {
    decode = jwt.verify(token, process.env.EMAIL_SECRET_KEY);
  } catch (error) {
    throw new apiError(400, "Invalid or expired token");
  }

  const user = await User.findOne({ email: decode.email });
  if (!user) {
    throw new apiError(400, "User not found");
  }

  if (!user.isResetTokenUsed) {
    throw new apiError(400, "This reset token has already been used.");
  }

  const hashedPassword = await bcrypt.hash(password, 5);

  const updatedUser = await User.findOneAndUpdate(
    { email: decode.email },
    { password: hashedPassword, isResetTokenUsed: false },
    { new: true }
  ).select("username email");

  if (!updatedUser) {
    throw new apiError(400, "Password reset failed");
  }

  return res
    .status(201)
    .json(new apiResponse(201, updatedUser, "Password reset successfully"));
});

const uploadExcelFile = asynchandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new apiError(400, "Please provide email");

  // Read the JSON file and parse the data
  const data = fs.readFileSync("src/userFitnessData.json", "utf-8");
  const { fitnessData } = JSON.parse(data);

  // Create a new workbook
  const workBook = new excelJs.Workbook();

  // Define a function to add a worksheet and populate it with data
  const addSheetWithData = (workBook, sheetName, columns, data) => {
    const sheet = workBook.addWorksheet(sheetName);
    sheet.columns = columns;

    data.forEach((value) => {
      sheet.addRow({
        name: value?.name || "",
        age: value?.age || "",
        gender: value?.gender || "",
        email: value?.email || "",
        fitnessLevel: value?.fitnessLevel || "",
        classPreferences: value?.classPreferences.join(", ") || "",
        goals: value?.goals.join(", ") || "",
        date: value?.date || "",
        progress: value?.progress || "",
        comments: value?.comments || "",
      });
    });

    // Center align the text in each column
    columns.forEach((col) => {
      sheet.getColumn(col.key).alignment = {
        vertical: "middle",
        horizontal: "center",
      };
    });
  };

  // Define columns for user fitness data
  const fitnessColumns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Age", key: "age", width: 10 },
    { header: "Gender", key: "gender", width: 15 },
    { header: "Email", key: "email", width: 30 },
    { header: "Fitness Level", key: "fitnessLevel", width: 20 },
    { header: "Class Preferences", key: "classPreferences", width: 30 },
    { header: "Goals", key: "goals", width: 50 },
  ];
  const progressColumns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Date", key: "date", width: 15 },
    { header: "Progress", key: "progress", width: 30 },
    { header: "Comments", key: "comments", width: 40 },
  ];

  // Add user fitness data to the sheet
  addSheetWithData(workBook, "User Fitness Data", fitnessColumns, fitnessData);
  addSheetWithData(
    workBook,
    "User Progress Data",
    progressColumns,
    fitnessData
  );

  // Generate buffer from workbook
  const excelBuffer = await workBook.xlsx.writeBuffer();

  // Setup nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: "gmail",
    secure: true,
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
  });

  // Setup mail options
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "New Excel File Uploaded",
    text: "A new file has been uploaded:",
    html: `
      <div style="display: flex; justify-content: center; align-items: center;">
        <style>
          .action {
            display: flex;
            justify-content: space-between;
            text-align: center;
            align-items: center;
            flex-direction: column;
            gap: 15px;
          }
          a.actionButton {
            color: white;
          }
        </style>
        <div style="display: block; max-width: 820px; text-align: center;">
          <div style="text-align: left; margin: 2%;">
            <p>Hi Subham Ojha,</p>
            <p>
              We hope you enjoyed the <b>STEP BASED CHALLENGE AUTOMATION REPORT!</b> 🎉 Below are the challenge results and all the details you’ll need to announce winners, send out prizes, or celebrate your team’s achievements.
            </p>
            <p>
              If you have any questions, don’t hesitate to reach out to your CSE or email us at <a href="mailto:customersuccess@wellnesscoach.live">customersuccess@wellnesscoach.live</a>.
            </p>
            <div>
              <p style="text-align: left;">
                <p>Be Well,</p>
                <b>The Wellness Coach Team</b>
              </p>
            </div>
          </div>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: "fitnessData.xlsx",
        content: excelBuffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  };

  // Send email
  await transporter.sendMail(mailOptions);

  return res
    .status(200)
    .json(
      new apiResponse(200, {}, "File uploaded and email sent successfully!")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannel,
  getWatchHistory,
  forgetPassword,
  resetPassword,
  uploadExcelFile,
};
