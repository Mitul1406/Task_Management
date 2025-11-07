import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";

export const counterResolver = {
 superAdminDashboardCount: async () => {
  try {
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();
    const doneTasks = await User.countDocuments({role:{$ne:"superAdmin"}});
    const pendingTasks = await Task.countDocuments({ status: "pending" });
    const inProgressTasks = await Task.countDocuments({ status: "in_progress" });

    const timerAgg = await Timer.aggregate([
      {
        $lookup: {
          from: "tasks",
          localField: "taskId",
          foreignField: "_id",
          as: "taskDetails",
        },
      },
      { $unwind: "$taskDetails" },
      {
        $lookup: {
          from: "projects",
          localField: "taskDetails.projectId",
          foreignField: "_id",
          as: "projectDetails",
        },
      },
      { $unwind: "$projectDetails" },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: "$userDetails" },
      {
        $group: {
          _id: {
            projectId: "$taskDetails.projectId",
            projectName: "$projectDetails.name",
            userId: "$userId",
            username: "$userDetails.username",
          },
          totalWorkTimeSeconds: { $sum: "$duration" },
        },
      },
      {
        $group: {
          _id: {
            projectId: "$_id.projectId",
            projectName: "$_id.projectName",
          },
          userContributions: {
            $push: {
              userId: "$_id.userId",
              username: "$_id.username",
              totalWorkTime: "$totalWorkTimeSeconds",
            },
          },
          totalProjectWorkTime: { $sum: "$totalWorkTimeSeconds" },
        },
      },
      {
        $project: {
          _id: 0,
          projectId: "$_id.projectId",
          projectName: "$_id.projectName",
          totalProjectWorkTime: "$totalProjectWorkTime",
          userContributions: 1,
        },
      },
      { $sort: { projectName: 1 } },
    ]);

    return {
      totalProjects,
      totalTasks,
      doneTasks,
      pendingTasks,
      inProgressTasks,
      projectContributions: timerAgg,
    };
  } catch (err) {
    console.error("Error in superAdminDashboardCount:", err);
    throw new Error("Failed to fetch dashboard counts");
  }
}



};
