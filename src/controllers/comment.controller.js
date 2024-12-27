import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId?.trim()) {
    throw new apiError(400, "Video ID is required.");
  }

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  if (pageNumber < 1 || limitNumber < 1) {
    throw new apiError(400, "Page and limit must be greater than zero.");
  }

  const getComment = await Comment.aggregate([
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "comments",
      },
    },
    {
      $addFields: {
        likeCount: { $size: "$comments" },
      },
    },
    {
      $facet: {
        metadata: [{ $count: "totalCount" }],
        data: [
          { $skip: (pageNumber - 1) * limitNumber },
          { $limit: limitNumber },
          {
            $project: {
              _id: 1,
              content: 1,
              video: 1,
              owner: 1,
              likeCount: 1,
            },
          },
        ],
      },
    },
  ]);

  const totalCount = getComment[0]?.metadata[0]?.totalCount || 0; // Handle case when no comments
  const comments = getComment[0]?.data || [];

  return res.status(200).json(
    new apiResponse(
      200,
      {
        comments,
        totalCount,
        page: pageNumber,
        limit: limitNumber,
      },
      "Pagination completed successfully."
    )
  );
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  if (!videoId?.trim()) {
    throw new apiError(400, "Video ID is required.");
  }
  if (!content?.trim()) {
    throw new apiError(400, "Comment content is required.");
  }

  // Create a new comment
  await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Comment added successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;
  error;
  if (!commentId?.trim()) {
    throw new apiError(400, "Comment Id is required.");
  }

  if (!content?.trim()) {
    throw new apiError(400, "Comment content is required.");
  }
  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new apiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!commentId?.trim()) {
    throw new apiError(400, "Comment ID is missing");
  }
  const getComment = await Comment.findById(commentId);

  if (!getComment) {
    throw new apiError(404, "Comment not found");
  }

  await Comment.deleteOne({ _id: commentId });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "Deleted Comment Successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
