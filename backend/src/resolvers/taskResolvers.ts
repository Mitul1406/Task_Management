import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";

export const taskResolver = {
tasks : async ({
  projectId,
  userId,
}: {
  projectId: string;
  userId?: string;
}) => {
  const query: any = { projectId: new mongoose.Types.ObjectId(projectId) };
  if (userId) query.assignedUserId = new mongoose.Types.ObjectId(userId);

  const taskList = await Task.find(query)
    .populate("assignedUser", "username _id email role")
    .sort({ createdAt: -1 })
    .lean();

  const tasksWithDetails = await Promise.all(
    taskList.map(async (task) => {
      const timers = await Timer.find({ taskId: task._id }).sort({ createdAt: 1 }).lean();

      const completedDurations = timers
        .filter((t) => t.duration != null)
        .map((t) => t.duration as number);
      const totalCompleted = completedDurations.reduce((a, b) => a + b, 0);

      const runningTimer = timers.find((t) => !t.endTime);
      let runningDuration = 0;
      if (runningTimer) {
        runningDuration = Math.floor(
          (new Date().getTime() - new Date(runningTimer.startTime).getTime()) / 1000
        );
      }

      return {
        id: task._id.toString(),
        projectId: task.projectId.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime,
        totalTime: totalCompleted + runningDuration,
        isRunning: !!runningTimer,
        runningTimer: runningTimer || undefined,
        overtime: (task as any).overtime || 0,
        savedTime: (task as any).savedTime || 0,
        assignedUser: (task as any).assignedUser
          ? {
              id: (task as any).assignedUser._id.toString(),
              username: (task as any).assignedUser.username,
              email: (task as any).assignedUser.email,
              role: (task as any).assignedUser.role,
            }
          : null,
      };
    })
  );

  return tasksWithDetails;
},


  task: async ({ id }: { id: string }) => {
    const task = await Task.findById(id);
    if (!task) throw new Error("Task not found");

    const timers = await Timer.find({ taskId: task._id });
    const totalDuration = timers.reduce((acc, t) => acc + (t.duration || 0), 0);
    const runningTimer = timers.find((t) => !t.endTime);

    return {
      ...task.toObject(),
      totalDuration,
      isRunning: !!runningTimer,
    };
  },

  createTask: async ({ projectId, title,estimatedTime, assignedUserId }: any) => {
  const newTask = new Task({
    projectId: new mongoose.Types.ObjectId(projectId),
    title,
    estimatedTime: estimatedTime || 0,
    assignedUserId: assignedUserId ? new mongoose.Types.ObjectId(assignedUserId) : undefined,
    savedTime:estimatedTime
  });

  await newTask.save();

  const populatedTask = await Task.findById(newTask._id)
    .populate("assignedUser", "username _id") 
    .exec();

  return populatedTask;
},



  updateTask: async ({ id, title, estimatedTime, assignedUserId }: any) => {
    const task = await Task.findById(id);
    if (!task) throw new Error("Task not found");
    if (title) task.title = title;
    if (estimatedTime !== undefined) task.estimatedTime = estimatedTime;
    if (assignedUserId) task.assignedUserId = assignedUserId;
    const timers = await Timer.find({ taskId: id });
  const totalDuration = timers.reduce((sum, t) => sum + (t.duration || 0), 0);

  if (task.estimatedTime !== undefined && task.estimatedTime > 0) {
    if (totalDuration > task.estimatedTime) {
      (task as any).overtime = totalDuration - task.estimatedTime;
      (task as any).savedTime = 0;
    } else {
      (task as any).savedTime = task.estimatedTime - totalDuration;
      (task as any).overtime = 0;
    }
  } else {
    (task as any).savedTime = 0;
    (task as any).overtime = 0;
  }

  // Store totalTime on task too (optional, for quick access)
  (task as any).totalTime = totalDuration;
    await task.save();
    return task;
  },
  deleteTask: async ({ id }: { id: string }) => {
    await Task.findByIdAndDelete(id);
    await Timer.deleteMany({ taskId: id });
    return true;
  },

tasksForUser: async ({ userId }: { userId: string }) => {
  const taskList = await Task.find({ assignedUserId: userId })
    .populate("assignedUser", "username email role")
    .exec();

  const projectMap: { [projectId: string]: any } = {};

  for (const task of taskList) {
    const projectId = (task.projectId as any).toString();

    if (!projectMap[projectId]) {
      const project = await Project.findById(projectId).exec();
      if (!project) continue;

      projectMap[projectId] = {
        id: (project as any)._id.toString(),
        name: project.name,
        description: project.description,
        tasks: [],
      };
    }

    const timers = await Timer.find({ taskId: task._id }).sort({ createdAt: 1 });

    const totalCompleted = timers
      .filter(t => t.duration != null)
      .reduce((sum, t) => sum + (t.duration || 0), 0);

    const runningTimer = timers.find(t => !t.endTime);
    const runningDuration = runningTimer
      ? Math.floor((Date.now() - new Date(runningTimer.startTime).getTime()) / 1000)
      : 0;

    projectMap[projectId].tasks.push({
      id: (task as any)._id.toString(),
      title: task.title,
      estimatedTime: task.estimatedTime,
      totalTime: totalCompleted + runningDuration,
      isRunning: !!runningTimer,
      runningDuration,
      assignedUser: (task as any).assignedUser
        ? {
            id: ((task as any).assignedUser as any)._id.toString(),
            username: (task as any).assignedUser.username,
            email: (task as any).assignedUser.email,
            role: (task as any).assignedUser.role,
          }
        : null,
    });
  }

  return Object.values(projectMap);
}


};
