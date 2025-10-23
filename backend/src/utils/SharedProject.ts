import { Project } from "../models/Project.js";
import mongoose from "mongoose";

export const getOrCreateDefaultProject = async () => {
  let project = await Project.findOne({ name: "Shared Tasks" });

  if (!project) {
    project = await Project.create({
      name: "Shared Tasks",
      description: "A shared project for general users tasks",
      adminId: new mongoose.Types.ObjectId("68f7179575313d92ad2ba758"),
    });
  }

  return project;
};
