import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async function (req, res) {
  // Get the user data from front end
  const { username, email, fullName, password } = req.body;

  // Validate the data - Check for blank data
  if (
    [fullName, email, username, password].some((value) => {
      value?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required to register the user.");
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existingUser)
    throw new ApiError(409, "User with same username or email already exists.");

  // Check if images are uploaded, check avatar
  // console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImagLocalPath = req.files?.coverImage[0]?.path;

  let coverImagLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImagLocalPath = req.files.coverImage.path;
  }

  if (!avatarLocalPath)
    throw new ApiError(400, "Avatar image is required to register the user");

  // Upload images on cloudinary, check avatar image uploaded
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImagLocalPath);

  if (!avatar)
    throw new ApiError(400, "Could not upload avatar image. Please try again.");

  // Register a new user - create method on db
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // Check if user created, Remove password and refresh token from user created
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser)
    throw new ApiError(500, "Something went wrong while registering the user");

  // Return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});
