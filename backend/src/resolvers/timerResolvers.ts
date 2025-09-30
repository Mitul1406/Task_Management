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

    return timer;
  },
};
