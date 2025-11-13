import mongoose from "mongoose";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";

export const counterResolver = {
 superAdminDashboardCount: async () => {
  try {
    const totalProjects = await Project.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalUser = await User.countDocuments({role:{$ne:"superAdmin"}});
    const teamLead = await User.countDocuments({role:"teamLead"})
    const employee = await User.countDocuments({role:"user"})
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
      totalUser,
      teamLead,
      employee,
      pendingTasks,
      inProgressTasks,
      projectContributions: timerAgg,
    };
  } catch (err) {
    console.error("Error in superAdminDashboardCount:", err);
    throw new Error("Failed to fetch dashboard counts");
  }
},
teamLeadDashboardCount: async ({ userId }: { userId: string }) => {
  try {
    if (!userId) throw new Error("User ID required");

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId format");
    }

    const projects = await Project.find({
      adminId: new mongoose.Types.ObjectId(userId),
    }).select("_id");
    if (!projects.length) {
      return {
        totalProjects: 0,
        totalTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        totalWorkedToday: 0,
      };
    }
    const sharedProject = await Project.findOne({ name: "User Created Taskss" }).select("_id");

    const projectIds = [
      ...projects.map((p) => p._id),
      ...(sharedProject ? [sharedProject._id] : []),
    ];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const allTasks = await Task.find({
      assignedUserId:new mongoose.Types.ObjectId(userId),
      projectId: { $in: projectIds },
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
    }).select("status");
    const totalTasks = allTasks.length;
    const pendingTasks = allTasks.filter((t) => t.status === "pending").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
    const taskIds = allTasks.map((t) => t._id);
    
    const timers = await Timer.aggregate([
      {
        $match: {
          taskId: { $in: taskIds },
          startTime: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: "$duration" }, 
        },
      },
    ]);

    const totalWorkedToday = timers[0]?.totalDuration || 0;
    return {
      totalProjects: projects.length,
      totalTasks,
      pendingTasks,
      inProgressTasks,
      totalWorkedToday,
    };
  } catch (err: any) {
    console.error("Error in teamLeadDashboardCount:", err.message);
    throw new Error("Failed to fetch dashboard data");
  }
},
empDashboardCount: async ({ userId }: { userId: string }) => {
  try {
    if (!userId) throw new Error("User ID required");

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid userId format");
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const allTasks = await Task.find({
      assignedUserId:new mongoose.Types.ObjectId(userId),
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
    }).select("status");
    
    const totalTasks = allTasks.length;
    const pendingTasks = allTasks.filter((t) => t.status === "pending").length;
    const inProgressTasks = allTasks.filter((t) => t.status === "in_progress").length;
    const taskIds = allTasks.map((t) => t._id);
    
    const timers = await Timer.aggregate([
      {
        $match: {
          taskId: { $in: taskIds },
          startTime: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: "$duration" }, 
        },
      },
    ]);

    const totalWorkedToday = timers[0]?.totalDuration || 0;
    return {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      totalWorkedToday,
    };
  } catch (err: any) {
    console.error("Error in empDashboardCount:", err.message);
    throw new Error("Failed to fetch dashboard data");
  }
},
}
