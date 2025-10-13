import mongoose from "mongoose";

const ScreenshotSchema = new mongoose.Schema({
  userId: String,
  filePath: String,
  createdAt: { type: Date, default: Date.now },
});
export const Screenshot = mongoose.model("Screenshot", ScreenshotSchema);
