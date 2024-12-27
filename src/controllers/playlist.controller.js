import mongoose, { isValidObjectId } from "mongoose";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";
import { PlayList } from "../models/playlist.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist
  if (!name?.trim()) {
    throw new apiError(400, "Playlist name is missing");
  }

  if (description === undefined && description.trim().length === 0) {
    throw new apiError(400, "Descripation is required");
  }

  const newPlaylist = await PlayList.create({
    name: name,
    description: description,
    owner: req.user._id,
  });

  const playlistDetails = await PlayList.findById(newPlaylist._id).select(
    "name description"
  );

  return res.status(200).json(
    new apiResponse(
      200,
      {
        playlistDetails,
      },
      "Playlist created successfully!"
    )
  );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) {
    throw new apiError(400, "User ID is required");
  }

  const playlists = await PlayList.find({ owner: userId }).select(
    "name description videos owner"
  );
  if (!playlists.length) {
    throw new apiError(400, "No playlists found for this user.");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, playlists, "User Playlists fetched successfully!")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId.trim()) {
    throw new apiError(
      400,
      "Playlist ID is required. Please provide a valid ID."
    );
  }
  const foundPlaylists = await PlayList.find({ _id: playlistId }).select(
    "name description videos owner"
  );
  if (!foundPlaylists.length) {
    throw new apiError(
      400,
      `No playlist found with ID: ${playlistId}. Please check the ID and try again.`
    );
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, foundPlaylists, "Playlists fetched successfully!")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!videoId.trim()) {
    throw new apiError(400, "Video ID is required.");
  }
  if (!playlistId.trim()) {
    throw new apiError(400, "Playlist ID is required.");
  }

  // const findVideoAvailable = await PlayList.aggregate([
  //   {
  //     $match: { _id: playlistId, videos: videoId }, // Match the playlist and check for video existence
  //   },
  //   {
  //     $lookup: {
  //       from: "videos",
  //       localField: "videos",
  //       foreignField: "_id",
  //       as: "videoDetails",
  //     },
  //   },
  //   {
  //     $unwind: {
  //       path: "$videoDetails",
  //       preserveNullAndEmptyArrays: true, // Keep playlists even if there are no videos
  //     },
  //   },
  //   {
  //     $match: {
  //       "videoDetails._id": videoId, // Check if the video exists in the videoDetails
  //     },
  //   },
  // ]);

  // if (!findVideoAvailable) {
  //   throw new apiError(400, "Video already exists in the playlist.");
  // }

  const updatedPlaylist = await PlayList.findOneAndUpdate(
    { _id: playlistId, videos: { $ne: videoId } }, // Ensure the video is not already in the playlist
    { $push: { videos: videoId } }, // Add the videoId to the videos array
    { new: true } // Return the updated document
  );

  if (!updatedPlaylist) {
    throw new apiError(
      400,
      "Playlist not found or video already exists in the playlist."
    );
  }
  return res.status(200).json(
    new apiResponse(
      200,
      {
        updatedPlaylist,
      },
      "Video added to playlist successfully."
    )
  );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!videoId.trim()) {
    throw new apiError(400, "Video ID is required.");
  }
  if (!playlistId.trim()) {
    throw new apiError(400, "Playlist ID is required.");
  }

  const removePlaylist = await PlayList.findOneAndUpdate(
    { _id: playlistId, videos: videoId }, // Ensure the video is already present in the playlist
    { $pull: { videos: videoId } }, // Remove the videoId from the videos array
    { new: true } // Return the updated playlist document
  );

  if (!removePlaylist) {
    throw new apiError(
      400,
      "Playlist not found or video is not part of the playlist."
    );
  }
  return res
    .status(200)
    .json(
      new apiResponse(200, {}, "Video removed from playlist successfully.")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId.trim()) {
    throw new apiError(400, "Playlist ID is required.");
  }

  const foundPlaylist = await PlayList.findById(playlistId);

  if (!foundPlaylist) {
    throw new apiError(404, "Playlist not found.");
  }

  await PlayList.deleteOne({ _id: playlistId });
  return res
    .status(200)
    .json(new apiResponse(200, {}, "Playlist deleted successfully."));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if (!playlistId.trim()) {
    throw new apiError(400, "Playlist ID is required.");
  }
  if (!name.trim()) {
    throw new apiError(400, "Playlist name is required.");
  }
  if (!description.trim()) {
    // Also corrected to check 'description'
    throw new apiError(400, "Playlist description is required.");
  }

  const updatePlaylist = await PlayList.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name,
        description,
      },
    },
    { new: true }
  );
  return res
    .status(200)
    .json(new apiResponse(200, updatePlaylist, "Comment updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
