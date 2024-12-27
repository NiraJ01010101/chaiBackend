import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const userId = req.user.id;
  // TODO: toggle subscription
  if (!subscriberId?.trim()) {
    throw new apiError(400, "Channel ID is required.");
  }

  const existingSubscription = await Subscription.findOne({
    subscriber: userId,
    channel: subscriberId,
  });

  if (existingSubscription) {
    // Unsubscribe
    await Subscription.deleteOne({ _id: existingSubscription._id });
    return res
      .status(200)
      .json(new apiResponse(200, {}, "Unsubscribed successfully."));
  } else {
    // Subscribe
    const newSubscription = await Subscription.create({
      subscriber: userId,
      channel: subscriberId,
    });
    return res
      .status(201)
      .json(
        new apiResponse(
          201,
          { subscription: newSubscription },
          "Subscribed successfully."
        )
      );
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Find all subscriptions for the given channelId
  const subscriptions = await Subscription.find({
    channel: channelId,
  })
    .populate("channel", "username email avatar")
    .exec();

  if (!subscriptions) {
    return res
      .status(404)
      .json({ message: "No subscriptions found for this user." });
  }

  // Extract channels' details
  const channelList = subscriptions.map((sub) => sub.channel);

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        channelList,
        "Subscribed channels retrieved successfully."
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  // Find all subscriptions for the given channel
  const subscribers = await Subscription.find({ subscriber: subscriberId })
    .populate("subscriber", "username email avatar") // Adjust fields as needed
    .exec();

  // If no subscribers found
  if (!subscribers) {
    throw new apiError(400, "No subscribers found for this channel");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, subscribers, "Subscribers retrieved successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
