import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";

export const taskResolver = {
tasks: async ({ projectId }: { projectId: string }) => {
  const taskList = await Task.find({ projectId });

  const tasksWithTimers = await Promise.all(
    taskList.map(async (task) => {
      const timers = await Timer.find({ taskId: task._id }).sort({ createdAt: 1 });

      const completedDurations: number[] = timers
        .filter((t) => t.duration != null)
        .map((t) => t.duration as number);

      const totalCompleted = completedDurations.reduce((a, b) => a + b, 0);

      const runningTimer = timers.find((t) => !t.endTime);
      let runningDuration = 0;
      if (runningTimer) {
        runningDuration = Math.floor((new Date().getTime() - new Date(runningTimer.startTime).getTime()) / 1000);
      }

      return {
        id: (task as any)._id.toString(),
        projectId: task.projectId,
        estimatedTime:task.estimatedTime,
        title: task.title,
        totalTime: totalCompleted + runningDuration,
        isRunning: !!runningTimer,
        runningTimer: runningTimer || undefined,
      };
    })
  );

  return tasksWithTimers;
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

  createTask: async ({ projectId, title,estimatedTime }: { projectId: string; title: string,estimatedTime?:number}) => {
  const task = new Task({ projectId, title, totalDuration: 0, isRunning: false,estimatedTime });
  return await task.save();
},

 updateTask: async ({ id, title, estimatedTime }: { id: string; title?: string; estimatedTime?: number }) => {
  const task = await Task.findById(id);
  if (!task) throw new Error("Task not found");
  if (title) task.title = title;
  if (estimatedTime !== undefined) task.estimatedTime = estimatedTime;
  return await task.save();
},
  deleteTask: async ({ id }: { id: string }) => {
    await Task.findByIdAndDelete(id);
    await Timer.deleteMany({ taskId: id });
    return true;
  },
};
