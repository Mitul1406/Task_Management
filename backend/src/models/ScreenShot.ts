import mongoose from "mongoose";

const screenshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  filename: String,
  filePath: String,
  createdAt: { type: Date, default: Date.now },
});
export const Screenshot = mongoose.model("Screenshot", screenshotSchema);