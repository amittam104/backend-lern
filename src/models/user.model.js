import mongoose, { Schema } from "mongooses";

const userSchema = new Schema({}, {});

export const User = mongoose.model("User", userSchema);
