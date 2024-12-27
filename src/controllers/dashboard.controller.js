import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getChannelStatus = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user.id;

  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  const totalVideos = await Video.countDocuments({ owner: userId });

  // total videos likes
  const totalLikesCount = await Video.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "totalVideosLikes",
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: { $size: "$totalVideosLikes" } },
      },
    },
  ]);

  const channelStatus = {
    totalVideos,
    totalLikes: totalLikesCount[0]?.totalLikes || 0,
    totalSubscribers,
  };

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelStatus,
        "Get Channel Status fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.find({ owner: userId });
  if (!videos) {
    throw new apiError(400, "No videos found for this channel.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        videos,
        "Videos retrieved successfully from the channel."
      )
    );
});

export { getChannelStatus, getChannelVideos };
