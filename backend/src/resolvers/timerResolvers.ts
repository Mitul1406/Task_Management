import { Timer } from "../models/Timer.js";
import { Task } from "../models/Task.js";

export const timerResolver = {
  startTimer: async ({ taskId }: { taskId: string }) => {
    const runningTimer = await Timer.findOne({ taskId, endTime: null });
    if (runningTimer) throw new Error("Timer already running for this task");

    const timer = new Timer({ taskId, startTime: new Date() });
    await timer.save();

    return timer;
  },

  stopTimer: async ({ taskId }: { taskId: string }) => {
    const timer = await Timer.findOne({ taskId, endTime: null });
    if (!timer) throw new Error("No running timer found for this task");

    timer.endTime = new Date();
    timer.duration = Math.floor((timer.endTime.getTime() - timer.startTime.getTime()) / 1000);
    await timer.save();

    const timers = await Timer.find({ taskId });
    const totalDuration = timers.reduce((sum, t) => sum + (t.duration || 0), 0);

     const task = await Task.findById(taskId);
     if (!task) throw new Error("Task not found");

   if (task.estimatedTime > 0) {
  if (totalDuration > task.estimatedTime) {
    (task as any).overtime = totalDuration - task.estimatedTime;
    (task as any).savedTime = 0;
  } else if (totalDuration < task.estimatedTime) {
    (task as any).savedTime = task.estimatedTime - totalDuration;
    (task as any).overtime = 0; 
  } else {
    (task as any).overtime = 0;
    (task as any).savedTime = 0;
  }
}


  await task.save();

  return { totalDuration, overtime: (task as any).overtime, savedTime: (task as any).savedTime };

  },
};
