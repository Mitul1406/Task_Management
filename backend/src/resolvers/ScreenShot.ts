// resolvers/ScreenshotResolver.ts
import { Screenshot } from "../models/Screenshot.js";

export const ScreenshotResolver = {
  getUserScreenshots: async (args: { userId: string }) => {
    try {
      const screenshots = await Screenshot.find({ userId: args.userId }).sort({ createdAt: -1 });
      return screenshots.map((s) => ({
        id: s._id,
        filePath: s.filePath,
        createdAt: s.createdAt,
      }));
    } catch (err) {
      console.error(err);
      throw new Error("Failed to fetch screenshots");
    }
  },
};
