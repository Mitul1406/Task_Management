import { Timer } from "../models/Timer.js";
import { Task } from "../models/Task.js";
import { error } from "console";

export const timerResolver = {
  startTimer: async ({ taskId, userId }: { taskId: string; userId: string }) => {
  const task: any = await Task.findById(taskId);
  if (!task) {
    return {
      success: false,
      message: "Task not found.",
    };
  }

  // ✅ Compare only date (not time)
  const today = new Date();
  const endDate = new Date(task.endDate);

  if (endDate.setHours(0, 0, 0, 0) < today.setHours(0, 0, 0, 0)) {
    return {
      success: false,
      message: "You can't start the timer because the task's end date has already passed.",
    };
  }

  // ✅ Check for existing running timer
  const runningTimer:any = await Timer.findOne({ taskId, userId, endTime: null });
  if (runningTimer) {
    return {
      id: runningTimer._id.toString(),
      taskId: runningTimer.taskId.toString(),
      userId: runningTimer.userId.toString(),
      startTime: runningTimer.startTime.toISOString(),
      endTime: runningTimer.endTime ? runningTimer.endTime.toISOString() : null,
      duration: runningTimer.duration ?? null,
      success: false,
      message: "Timer already running for this task by this user.",
    };
  }

  // ✅ Create new timer
  const timer:any = new Timer({
    taskId,
    userId,
    startTime: new Date(),
  });
  await timer.save();
  // ✅ Return properly shaped GraphQL object
  return {
    id: timer._id.toString(),
    taskId: timer.taskId.toString(),
    userId: timer.userId.toString(),
    startTime: timer.startTime.toISOString(),
    endTime: timer.endTime ? timer.endTime.toISOString() : null,
    duration: timer.duration ?? null,
    success: true,
    message: "Timer started successfully.",
  };
}
,
//   startTimer: async ({ taskId, userId }: { taskId: string; userId: string }) => {
//     const task:any=await Task.findById(taskId)
//     const today:any=new Date().toISOString().split("T")[0]
//     const endDate:any=new Date(task.endDate).toISOString().split("T")[0]
    
//     console.log("today:", today);
// console.log("endDate:", endDate);
// console.log("compare:", endDate < today);

//     // if(endDate<today) throw new Error("You can't start the timer because the task's end date has already passed.")
//     if(endDate<today){
//       return{
//         success:false,
//         message:"You can't start the timer because the task's end date has already passed."
//       }
//     }
//     const runningTimer = await Timer.findOne({ taskId, userId, endTime: null });
//     // if (runningTimer) throw new Error("Timer already running for this task by this user")
//     if(runningTimer)
//     {
//       return{
//         success:false,
//         message:"Timer already running for this task by this user"
//       }
//     }

//     const timer = new Timer({
//       taskId,
//       userId,           // track who started the timer
//       startTime: new Date(),
//     });

//     await timer.save();
//     // return timer
//     return{
//        ...timer,
//         success:true,
//         message:"Timer start."
//       }
//   },

  stopTimer: async ({ taskId, userId }: { taskId: string; userId: string }) => {
    // Find the running timer for this user
    const timer = await Timer.findOne({ taskId, userId, endTime: null });
    if (!timer) throw new Error("No running timer found for this task by this user");

    timer.endTime = new Date();
    timer.duration = Math.floor((timer.endTime.getTime() - timer.startTime.getTime()) / 1000);
    await timer.save();

    // Calculate total time **per task** (all users)
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

    return {
      totalDuration,
      overtime: (task as any).overtime,
      savedTime: (task as any).savedTime,
    };
  },
};
