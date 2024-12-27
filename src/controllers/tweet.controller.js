import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { tweet } = req.body;
  if (!tweet.trim()) {
    throw new apiError(400, "Tweet is required");
  }
  await Tweet.create({
    content: tweet,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Tweet added successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId?.trim()) {
    throw new apiError(400, "User ID is required.");
  }

  const userTweets = await Tweet.find({ owner: userId }).select(
    "owner content"
  );
  if (!userTweets || userTweets.length === 0) {
    throw new apiError(404, "No tweets found for this user");
  }

  return res.json(
    new apiResponse(
      200,
      {
        userTweets,
      },
      "User tweets retrieved successfully."
    )
  );
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { tweet } = req.body;
  if (!tweetId.trim()) {
    throw new apiError(400, "Tweet Id is required");
  }
  if (!tweet.trim()) {
    throw new apiError(400, "Tweet is required");
  }
  const updatedUpdateTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content: tweet,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId.trim()) {
    throw new apiError(400, "Tweet Id is required");
  }

  const getComment = await Tweet.findById(tweetId);
  if (!getComment) {
    throw new apiError(404, "Comment not found");
  }

  await Tweet.deleteOne({ _id: tweetId });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Deleted Tweet Successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
