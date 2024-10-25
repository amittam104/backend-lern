import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: true });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh tokens."
    );
  }
};

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

export const loginUser = asyncHandler(async function (req, res) {
  // Get data from req body - username, email and password
  const { username, email, password } = req.body;

  // Check if username and email are there
  if (!username && !email)
    throw new ApiError(400, "username or email is required");

  // Find and Check if user exists or not using username and email (either or)
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) throw new ApiError(404, "User does not exists");

  // Password check
  const isValidPassword = await user.isPasswordCorrect(password);

  if (!isValidPassword) throw new ApiError(401, "Invalid user credentials");

  // Add Access token and refresh token to user and
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Send cookies to client with these tokens
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // Send response - user, access token, refresh token
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncHandler(async function (req, res) {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});
