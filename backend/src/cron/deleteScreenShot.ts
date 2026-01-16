import cron from "node-cron";
import fs from "fs";
import path from "path";
import { Screenshot } from "../models/ScreenShot.ts";

const SCREENSHOT_DIR = path.join(process.cwd(), "uploads", "screenshots");

cron.schedule(process.env.DELETE_SCREENSHOT_CRON!, async () => {
  try {

    const result = await Screenshot.deleteMany({});
    if (fs.existsSync(SCREENSHOT_DIR)) {
      const files = fs.readdirSync(SCREENSHOT_DIR);

      for (const file of files) {
        fs.unlinkSync(path.join(SCREENSHOT_DIR, file));
      }

    }

  } catch (err) {
    console.error("❌ Screenshot cleanup failed", err);
  }
});
