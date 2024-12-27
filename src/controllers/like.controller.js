import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  if (!videoId?.trim()) {
    throw new apiError(400, "Video ID is required.");
  }
  const isLiked = await Like.exists({ video: videoId, likedBy: req.user._id });

  if (isLiked) {
    await Like.deleteOne({
      video: videoId,
      likedBy: req.user._id,
    });
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
  }
  let totalLikes = await Like.countDocuments({ video: videoId });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        totalLikes,
      },
      `Video has been ${isLiked ? "Disliked" : "Liked"} successfully!`
    )
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  if (!commentId?.trim()) {
    throw new apiError(400, "Comment ID is required.");
  }

  const isCommenLiked = await Like.exists({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (isCommenLiked) {
    await Like.deleteOne({
      comment: commentId,
      likedBy: req.user._id,
    });
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
  }
  let totalCommenLikes = await Like.countDocuments({ comment: commentId });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        totalCommenLikes,
      },
      `Commen has been ${isCommenLiked ? "Disliked" : "Liked"} successfully!`
    )
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!tweetId?.trim()) {
    throw new apiError(400, "Tweet ID is required.");
  }

  const isTweetLiked = await Like.exists({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (isTweetLiked) {
    await Like.deleteOne({
      tweet: tweetId,
      likedBy: req.user._id,
    });
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });
  }
  let totalTweetLikes = await Like.countDocuments({ tweet: tweetId });

  return res.status(200).json(
    new apiResponse(
      200,
      {
        totalTweetLikes,
      },
      `Tweet has been ${isTweetLiked ? "Disliked" : "Liked"} successfully!`
    )
  );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos --aggrication pipeline
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user._id),
        video: { $ne: null }, //get only video refrence
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: {
        path: "$videoDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        videoId: "$videoDetails._id",
        videoFile: "$videoDetails.videoFile",
        thumbnail: "$videoDetails.thumbnail",
        title: "$videoDetails.title",
        description: "$videoDetails.description",
        duration: "$videoDetails.duration",
        views: "$videoDetails.views",
        isPublished: "$videoDetails.isPublished",
        owner: "$videoDetails.owner",
      },
    },
  ]);

  if (!likedVideos.length) {
    return res.status(404).json({ message: "No liked videos found." });
  }
  return res.status(200).json(
    new apiResponse(
      200,
      {
        likedVideos,
        // totalCount,
        // page: pageNumber,
        // limit: limitNumber,
      },
      "Liked Videos Get successfully."
    )
  );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
