import mongoose, { Schema, mongo } from "mongoose";

const videoSchema = new Schema({}, {});

export const Video = mongoose.model("Video", videoSchema);
