import { asyncHandler } from "../utils/asyncHandler.js";

export const registerUser = asyncHandler(async function (req, res) {
  res.status(200).json({
    message: "ok",
  });
});
