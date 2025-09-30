import {projectResolver} from "./ProjectResolvers.js"
import { taskResolver } from "./taskResolvers.js";
import { timerResolver } from "./timerResolvers.js";

export const rootResolver = {
  ...projectResolver,
  ...taskResolver,
  ...timerResolver,
};
