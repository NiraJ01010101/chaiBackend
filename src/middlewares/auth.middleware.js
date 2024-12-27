import jwt from "jsonwebtoken";
import { apiError } from "../utils/apiError.js";
import asynchandler from "../utils/asynchandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asynchandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer", ""); //mobile store cookies

    if (!token) {
      throw new apiError(401, "Unathorized request");
    }

    const dycryptToken = await jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(dycryptToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "Invalid access token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, error.message || "Invalid access token");
  }
});
