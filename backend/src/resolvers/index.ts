import { authResolver } from "./auth.js";
import {projectResolver} from "./ProjectResolvers.js"
import { ScreenshotResolver } from "./ScreenShot.js";
import { taskResolver } from "./taskResolvers.js";
import { timerResolver } from "./timerResolvers.js";
import { userResolver } from "./user.js";

export const rootResolver = {
  ...projectResolver,
  ...taskResolver,
  ...timerResolver,
  ...authResolver,
  ...userResolver,
  ...ScreenshotResolver,
};
