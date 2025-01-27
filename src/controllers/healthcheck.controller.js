import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import asyncHandler from "../utils/asynchandler.js";

const healthcheck = asyncHandler(async (req, res) => {
  //TODO: build a healthcheck response that simply returns the OK status as json with a message
  try {
    return res
      .status(200)
      .json(
        new apiResponse(200, { status: "OK" }, "User fetched successfully")
      );
  } catch (error) {
    throw new apiError(
      500,
      "Internal Server Error",
      "Failed to perform healthcheck."
    );
  }
});

export { healthcheck };
