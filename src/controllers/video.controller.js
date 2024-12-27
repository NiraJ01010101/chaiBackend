import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { oldImageDelete } from "../utils/oldImageDelete.js";
import { ObjectId } from "mongodb";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  if (pageNumber < 1 || limitNumber < 1) {
    throw new apiError(400, "Page and limit must be greater than zero.");
  }

  const allVideos = await Video.aggregate([
    {
      $facet: {
        metadata: [{ $count: "totalCount" }],
        data: [
          { $skip: (pageNumber - 1) * limitNumber },
          { $limit: limitNumber },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "userInfo",
            },
          },
          {
            $addFields: {
              channelName: { $arrayElemAt: ["$userInfo.fullname", 0] },
              videoAvatar: { $arrayElemAt: ["$userInfo.avatar", 0] }
            }
          },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              description: 1,
              duration: 1,
              isPublished: 1,
              owner: 1,
              thumbnail: 1,
              title: 1,
              views: 1,
              channelName: 1,
              videoAvatar: 1
            },
          },
        ],
      },
    },
  ]);

  const totalCount = allVideos[0]?.metadata[0]?.totalCount || 0;
  const videos = allVideos[0]?.data || [];

  return res.status(200).json(
    new apiResponse(
      200,
      {
        videos,
        totalCount,
        page: pageNumber,
        limit: limitNumber,
      },
      "Pagination completed successfully."
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description, userId } = req.body;
  // TODO: get video, upload to cloudinary, create video
  const videoFileLocalPath =
    req.files &&
      Array.isArray(req.files.videoFile) &&
      req.files.videoFile.length > 0
      ? req.files.videoFile[0].path
      : "";
  let thumbnailLocalPath;
  if (
    req.files &&
    Array.isArray(req.files?.thumbnail) &&
    req.files?.thumbnail.length > 0
  ) {
    thumbnailLocalPath = req.files?.thumbnail[0]?.path;
  }

  if (!videoFileLocalPath) {
    throw new apiError(400, "Video local file is required");
  }

  // upload them to cloudinary,videoFile
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!videoFile) {
    throw new apiError(400, "Video file is required");
  }
  const user = await Video.create({
    title,
    description,
    duration: videoFile?.duration,
    videoFile: videoFile?.url,
    thumbnail: thumbnail?.url || "",
    owner: userId,
  });
  const videoUpload = await Video.findById(user._id);
  return res.status(200).json(
    new apiResponse(
      200,
      {
        videoData: videoUpload,
      },
      "Video upload SuccessFully"
    )
  );
});

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;
  if (!videoId?.trim()) {
    throw new apiError(400, "VideoId is missing");
  }

  const getVideo = await Video.findById(videoId); // Adjust according to your actual DB query method
  if (!getVideo) {
    throw new apiError(404, "Video not found");
  }

  const videoWithOwner = await Video.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "users", // The users collection
        localField: "owner", // Assuming video has an ownerId field
        foreignField: "_id", // The _id field in users collection
        as: "ownerDetails", // The output array field
      },
    },
    {
      $addFields: {
        ownerDetails: {
          $first: "$ownerDetails", // Take the first matched user
        },
      },
    },
    // Count the number of likes
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$likes" },
      },
    },
    // Count the number of comments
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentsCount: { $size: "$comments" },
      },
    },
    {
      $project: {
        // Include all fields from the Video collection
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        owner: {
          fullname: "$ownerDetails.fullname", // Include only fullname
          email: "$ownerDetails.email", // Include only email
        },
        likeCount: 1,
        commentsCount: 1,
      },
    },
  ]);

  // If you want to format the result to match your desired structure

  // const getVideosWithOwners = await Video.find().populate(
  //   "owner",
  //   "username email fullname avatar"
  // ); // Populate specific fields from User

  // Send video details as response
  return res
    .status(200)
    .json(new apiResponse(200, videoWithOwner[0], "Video get SuccessFully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  //TODO: update video details like title, description, thumbnail
  if (!videoId?.trim()) {
    throw new apiError(400, "VideoId is missing");
  }
  let thumbnailLocalPath = req.file?.path;
  const oldThumbnailId = await Video.findById(videoId);

  // upload them to cloudinary,thumbnail
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  const updatedVideoDetails = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail?.url || "",
      },
    },
    { new: true }
  );

  if (oldThumbnailId?.thumbnail) {
    const oldThumbnailPublicId = oldThumbnailId.thumbnail
      .split("/")
      .pop()
      .split(".")[0];

    // Delete the video and thumbnail from Cloudinary
    await oldImageDelete(oldThumbnailPublicId, "image");
  }
  return res
    .status(200)
    .json(
      new apiResponse(200, updatedVideoDetails, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim()) {
    throw new apiError(400, "VideoId is missing");
  }

  // Fetch the video from the database
  const getVideo = await Video.findById(videoId);
  // console.log("Fetched Video:", getVideo);

  if (!getVideo) {
    throw new apiError(404, "Video not found");
  }

  await Video.deleteOne({ _id: videoId });

  // Check if video and thumbnail information is available
  if (getVideo?.videoFile && getVideo?.thumbnail) {
    const oldVideoPublicId = getVideo.videoFile.split("/").pop().split(".")[0];
    const oldThumbnailPublicId = getVideo.thumbnail
      .split("/")
      .pop()
      .split(".")[0];

    // console.log("Deleting Video with Public ID:", oldVideoPublicId);
    // console.log("Deleting Thumbnail with Public ID:", oldThumbnailPublicId);

    // Delete the video and thumbnail from Cloudinary
    await oldImageDelete(oldVideoPublicId, "video");
    await oldImageDelete(oldThumbnailPublicId, "image");
  }

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Deleted Video Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { isPublished } = req.body;

  if (!videoId?.trim()) {
    throw new apiError(400, `Video with ID ${videoId} not found`);
  }

  const oldVideo = await Video.findById(videoId);
  if (!oldVideo) {
    throw new apiError(400, "Published Video not found");
  }

  const updatedIsPublished = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: isPublished ? true : false,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        { isPublished: updatedIsPublished?.isPublished },
        `Video has been ${updatedIsPublished.isPublished ? "published" : "unpublished"} successfully`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
