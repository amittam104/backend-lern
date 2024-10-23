import { asyncHandler } from "../utils/asyncHandler";

export const registerUser = asyncHandler(async function (req, res) {
  return res.status(200).json({
    message: ok,
  });
});
