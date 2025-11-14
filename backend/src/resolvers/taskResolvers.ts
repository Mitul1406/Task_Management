import mongoose, { Types } from "mongoose";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";
import { Project } from "../models/Project.js";
import { getOrCreateDefaultProject } from "../utils/SharedProject.ts"
const formatDate = (val: any) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toISOString().split("T")[0]; 
};
export const taskResolver = {
  
tasks: async ({
  projectId,
  userId,
}: {
  projectId: string;
  userId?: string;
}) => {
  const query: any = { projectId: new mongoose.Types.ObjectId(projectId) };
  if (userId) query.assignedUserId = new mongoose.Types.ObjectId(userId);

  const tasks = await Task.find(query)
    .populate("assignedUser", "username _id email role")
    .sort({ createdAt: -1 })
    .lean();

  const allTaskIds = tasks.map((t: any) => t._id);
  const timers = await Timer.find({ taskId: { $in: allTaskIds } })
    .populate("userId", "username _id email role")
    .lean();

  const taskTimersMap: Record<string, any[]> = {};
  for (const t of timers) {
    const tid = t.taskId?.toString?.() || "";
    if (!tid) continue;
    if (!taskTimersMap[tid]) taskTimersMap[tid] = [];
    taskTimersMap[tid].push(t);
  }

  // ✅ Build final structured data
  const results = await Promise.all(
    tasks.map(async (task: any) => {
      const taskTimers = taskTimersMap[task._id.toString()] || [];

      // 🧮 Aggregate worked time per user
      const userWorkMap: Record<string, any> = {};
      let totalWorkedTime = 0;

      for (const timer of taskTimers) {
        const user: any = timer.userId;
        if (!user) continue;

        const uid = user._id?.toString?.() || "unknown";
        const username = user.username || "Unknown";

        // Calculate duration
        let duration = 0;
        if (timer.duration != null) {
          duration = timer.duration;
        } else if (!timer.endTime && timer.startTime) {
          duration = Math.floor(
            (Date.now() - new Date(timer.startTime).getTime()) / 1000
          );
        }

        totalWorkedTime += duration;

        if (!userWorkMap[uid]) {
          userWorkMap[uid] = {
            id: uid,
            username,
            email: user.email || "",
            role: user.role || "",
            totalTime: 0,
          };
        }

        userWorkMap[uid].totalTime += duration;
      }

      const users = Object.values(userWorkMap);

      // 🧍 Always include assigned user even if they have no timers
      if (
        task.assignedUser &&
        !users.find((u: any) => u.id === task.assignedUser._id.toString())
      ) {
        users.push({
          id: task.assignedUser._id.toString(),
          username: task.assignedUser.username,
          email: task.assignedUser.email || "",
          role: task.assignedUser.role || "",
          totalTime: 0,
        });
      }

      const runningTimer = taskTimers.find((t) => !t.endTime) || null;

      return {
        id: task._id.toString(),
        projectId: task.projectId?.toString?.() || "",
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        savedTime: task.savedTime || 0,
        overtime: task.overtime || 0,
        totalTime: totalWorkedTime, // total time worked by all users
        users, // all users who worked on this task + assigned user
        assignedUser: task.assignedUser
          ? {
              id: task.assignedUser._id.toString(),
              username: task.assignedUser.username,
              email: task.assignedUser.email,
              role: task.assignedUser.role,
            }
          : null,
        startDate: formatDate(task.startDate) || "",
        endDate: formatDate(task.endDate) || "",
        status: task.status,
        runningTimer: runningTimer
          ? {
              id: runningTimer._id.toString(),
              startTime: runningTimer.startTime.toISOString(),
              endTime: null,
              duration: Math.floor(
                (Date.now() - new Date(runningTimer.startTime).getTime()) / 1000
              ),
            }
          : null,
      };
    })
  );

  return results;
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

  createTask: async ({ projectId, title, estimatedTime, assignedUserId, startDate, endDate }: any) => {
  let validProjectId = projectId;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    const sharedProject = await getOrCreateDefaultProject();
    validProjectId = sharedProject._id;
  }

  if(projectId)
  {
  const projectExists = await Project.exists({ _id: projectId });
  if (!projectExists) {
    throw new Error(`Project not found.`);
  }
  }

  const newTask = new Task({
    projectId: new mongoose.Types.ObjectId(validProjectId),
    title,
    estimatedTime: estimatedTime || 0,
    savedTime: estimatedTime,
    assignedUserId: assignedUserId ? new mongoose.Types.ObjectId(assignedUserId) : undefined,
    startDate,
    endDate,
  });

  await newTask.save();

  const populatedTask = await Task.findById(newTask._id)
    .populate("assignedUser", "username _id")
    .exec();

  return populatedTask;
},

  updateTask: async ({ id, title, estimatedTime, assignedUserId,startDate,endDate }: any) => {
    const task = await Task.findById(id);
    if (!task) throw new Error("Task not found");
    if (title) task.title = title;
    if (startDate) (task as any).startDate = new Date(startDate);
    if (endDate) (task as any).endDate = new Date(endDate);
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
  (task as any).totalTime = totalDuration;

  await task.save();
  const populatedTask = await Task.findById(task._id)
    .populate("assignedUser", "username _id") 
    .exec();

  return populatedTask;
  
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

    // Get only timers for this specific user
    const timers = await Timer.find({ taskId: task._id, userId }).sort({ createdAt: 1 });

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
      startDate: (task as any).startDate,
      endDate: (task as any).endDate,
      status: task.status,
      estimatedTime: task.estimatedTime,
      totalTime: totalCompleted + runningDuration,
      savedTime:(task as any).savedTime,
      overtime:(task as any).overtime,
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
},

dayWiseData: async ({
  projectId,
  userIds,
  startDate,
  endDate,
}: {
  projectId: string;
  userIds: string[];
  startDate: string | Date;
  endDate: string | Date;
}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // ✅ Build date range
  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const uniqueUserIds = [...new Set(userIds)];

  // ✅ Fetch all tasks in this project
  const tasks = await Task.find({
    projectId: new mongoose.Types.ObjectId(projectId),
  }).lean();

  const taskIds = tasks.map((t) => t._id.toString());
  const timers = await Timer.find({ taskId: { $in: taskIds } }).lean();

  // ✅ workedMap[taskId][userId][dayKey] = seconds
  const workedMap: Record<string, Record<string, Record<string, number>>> = {};
  for (const t of timers) {
    const taskId = t.taskId.toString();
    const userId = t.userId?.toString?.() || "";
    if (!userId) continue;
    const dayKey: any = new Date(t.startTime).toISOString().split("T")[0];
    workedMap[taskId] = workedMap[taskId] || {};
    workedMap[taskId][userId] = workedMap[taskId][userId] || {};
    workedMap[taskId][userId][dayKey] =
      (workedMap[taskId][userId][dayKey] || 0) + (t.duration || 0);
  }

  // ✅ Track cumulative worked time for each task (across all users)
  const cumulativeWorked: Record<string, number> = {};

  // ✅ Build final data per day
  const dayWiseData = dates.map((date) => {
    const dayKey: any = date.toISOString().split("T")[0];

    const users = uniqueUserIds.map((userId) => {
      const userTasks = tasks.filter(
        (task) =>
          task.assignedUserId?.toString() === userId ||
          workedMap[task._id.toString()]?.[userId]
      );

      const taskTimers = userTasks
        .map((task) => {
          const taskId = task._id.toString();
          const estimated = task.estimatedTime || 0;
          const prevWorked = cumulativeWorked[taskId] || 0;

          // 🧍‍♂️ This user’s time today
          const workedToday = workedMap[taskId]?.[userId]?.[dayKey] || 0;

          // 🧮 Total work done by *all* users today on this task
          const totalWorkedToday = Object.values(workedMap[taskId] || {}).reduce(
            (sum, userMap) => sum + (userMap?.[dayKey] || 0),
            0
          );

          // 🧮 Update total (for all users)
          const newTotal = prevWorked + totalWorkedToday;

          let overtime = 0;
          let savedTime = 0;

          if (prevWorked >= estimated) {
            // Already exceeded before → all today's work = overtime
            overtime = totalWorkedToday;
          } else if (newTotal > estimated) {
            // Crosses estimate today
            overtime = newTotal - estimated;
            savedTime = 0;
          } else {
            // Still within estimate
            savedTime = estimated - newTotal;
          }

          // Update cumulative tracker
          cumulativeWorked[taskId] = newTotal;

          return {
            taskId,
            title: task.title,
            time: workedToday,
            estimatedTime: estimated,
            savedTime,
            overtime,
            status: task.status,
          };
        })
        // 🚫 Skip tasks where user didn’t work today
        .filter((task) => task.time > 0);

      const totalTime = taskTimers.reduce((sum, t) => sum + (t.time || 0), 0);

      return {
        userId,
        time: totalTime,
        status: totalTime > 0 ? "Worked" : "Not Worked",
        tasks: taskTimers,
      };
    });

    return { date: dayKey, users };
  });

  return dayWiseData;
},


userDayWise: async ({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate: string | Date;
  endDate: string | Date;
}) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  // ✅ Generate date range
  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // ✅ Tasks assigned or worked on by this user
  const assignedTasks = await Task.find({ assignedUserId: userId }).lean();
  const assignedTaskIds = assignedTasks.map((t) => t._id.toString());

  const timers = await Timer.find({
    userId,
    startTime: { $gte: start, $lte: end },
  }).lean();

  const timerTaskIds = Array.from(new Set(timers.map((t) => t.taskId?.toString()).filter(Boolean)));
  const allTaskIds = Array.from(new Set([...assignedTaskIds, ...timerTaskIds]));

  const tasks = await Task.find({ _id: { $in: allTaskIds } }).lean();

  // --- task info map ---
  const taskInfoMap: Record<string, any> = {};
  for (const t of tasks) {
    taskInfoMap[t._id.toString()] = {
      projectId: (t.projectId as any)?.toString?.() || "",
      title: t.title,
      estimatedTime: t.estimatedTime || 0,
      startDate: (t as any).startDate ? new Date((t as any).startDate) : undefined,
      endDate: (t as any).endDate ? new Date((t as any).endDate) : undefined,
      status: t.status,
    };
  }

  // --- worked per task per date (for this user) ---
  const workedByTaskByDate: Record<string, Record<string, number>> = {};
  for (const t of timers) {
    if (!t.taskId) continue;
    const taskId = t.taskId.toString();
    const dayKey: any = new Date(t.startTime).toISOString().split("T")[0];
    if (!workedByTaskByDate[taskId]) workedByTaskByDate[taskId] = {};
    workedByTaskByDate[taskId][dayKey] =
      (workedByTaskByDate[taskId][dayKey] || 0) + (t.duration || 0);
  }

  // --- projects ---
  const projectIds = Array.from(
    new Set(tasks.map((t) => (t.projectId as any)?.toString?.()).filter(Boolean))
  );
  const projects = await Project.find({ _id: { $in: projectIds } }).lean();

  const projectMap: Record<string, any> = {};
  for (const p of projects) {
    projectMap[p._id.toString()] = {
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      tasks: [],
    };
  }

  // --- cumulative tracker for each task ---
  const cumulativeWorked: Record<string, number> = {};

  // --- build day-wise ---
  const dayWiseData = dates.map((date) => {
    const dayKey: any = date.toISOString().split("T")[0];
    const dayTasks: any[] = [];

    for (const task of tasks) {
      const taskId = task._id.toString();
      const info = taskInfoMap[taskId];
      if (!info) continue;

      const workedToday = workedByTaskByDate[taskId]?.[dayKey] || 0;
      if (workedToday === 0) continue;

      const estimate = info.estimatedTime || 0;
      const prevWorked = cumulativeWorked[taskId] || 0;
      const newTotal = prevWorked + workedToday;

      let overtime = 0;
      let savedTime = 0;

      if (prevWorked >= estimate) {
        // Already exceeded earlier → all new work is overtime
        overtime = workedToday;
      } else if (newTotal > estimate) {
        // Crossed estimate today
        overtime = newTotal - estimate;
        savedTime = 0;
      } else {
        // Still within estimate
        savedTime = estimate - newTotal;
      }

      // Update cumulative tracker
      cumulativeWorked[taskId] = newTotal;

      const newTask = {
        taskId,
        id: taskId,
        title: info.title,
        time: workedToday,
        estimatedTime: estimate,
        savedTime,
        overtime,
        startDate: info.startDate,
        endDate: info.endDate,
        status: info.status,
      };

      if (info.projectId && projectMap[info.projectId]) {
        projectMap[info.projectId].tasks.push({ ...newTask });
      }

      dayTasks.push(newTask);
    }

    return {
      date: dayKey,
      time: dayTasks.reduce((s, t) => s + (t.time || 0), 0),
      status: dayTasks.length > 0 ? "Worked" : "Not Worked",
      tasks: [...dayTasks],
    };
  });

  return {
    projects: Object.values(projectMap),
    dayWise: dayWiseData,
  };
},

updateTaskStatus: async ({ taskId, status }: { taskId: string; status: string }) => {

  const allowedStatuses = ["pending", "in_progress", "code_review", "done"];
  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status value");
  }

  const updatedTask = await Task.findByIdAndUpdate(
    taskId,
    { status },
    { new: true, upsert: false }
  )
    .populate("assignedUser", "username _id") 
    .exec();

  if (!updatedTask) {
    throw new Error("Task not found");
  }

  return updatedTask;
},

// userDayWiseAdmin: async ({
//   startDate,
//   endDate,
// }: {
//   startDate: string | Date;
//   endDate: string | Date;
// }) => {
//   const start = new Date(startDate);
//   const end = new Date(endDate);

//   const dates: Date[] = [];
//   const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
//   const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

//   while (current <= endUTC) {
//     dates.push(new Date(current));
//     current.setUTCDate(current.getUTCDate() + 1);
//   }

//   const users = await User.find().lean();

//   const result = [];

//   for (const user of users) {
//     const tasks = await Task.find({ assignedUserId: user._id }).lean();
//     const taskIds = tasks.map((t) => t._id.toString());

//     const taskInfoMap: Record<string, any> = {};
//     for (const task of tasks) {
//       taskInfoMap[task._id.toString()] = {
//         projectId: task.projectId.toString(),
//         title: task.title,
//         estimatedTime: task.estimatedTime || 0,
//         startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
//         endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
//         status: task.status,
//       };
//     }

//     // Fetch timers
//     const timers = await Timer.find({ taskId: { $in: taskIds } }).lean();

//     const workedByTaskByDate: Record<string, Record<string, number>> = {};
//     timers.forEach((t: any) => {
//       const taskId = t.taskId.toString();
//       const dayKey = new Date(t.startTime).toISOString().split("T")[0];
//       workedByTaskByDate[taskId] = workedByTaskByDate[taskId] || {};
//       workedByTaskByDate[taskId][(dayKey as any)] = (workedByTaskByDate[taskId][(dayKey as any)] || 0) + (t.duration || 0);
//     });

//     // Fetch projects
//     const projectIds = Array.from(new Set(tasks.map(t => t.projectId.toString())));
//     const projects = await Project.find({ _id: { $in: projectIds } }).lean();
//     const projectMap: Record<string, any> = {};
//     for (const project of projects) {
//       projectMap[project._id.toString()] = {
//         id: project._id.toString(),
//         name: project.name,
//         description: project.description,
//         tasks: [],
//       };
//     }

//     // Build day-wise data
//     const dayWiseData = dates.map((date) => {
//       const dayKey = date.toISOString().split("T")[0];

//       const taskTimers = tasks
//         .map((task) => {
//           const taskId = task._id.toString();
//           const info = taskInfoMap[taskId];
//           if (!info) return null;

//           const workedToday = workedByTaskByDate[taskId]?.[(dayKey as any)] || 0;
//           if (workedToday === 0) return null;

//           const totalWorkedBefore = Object.entries(workedByTaskByDate[taskId] || {})
//             .filter(([d]) => d < (dayKey as any))
//             .reduce((sum, [, val]) => sum + val, 0);

//           const remainingEstimated = Math.max(info.estimatedTime - totalWorkedBefore, 0);
//           const overtime = Math.max(workedToday - remainingEstimated, 0);
//           const savedTime = Math.max(info.estimatedTime - (totalWorkedBefore + workedToday), 0);

//           // Add to project
//           if (projectMap[info.projectId]) {
//             projectMap[info.projectId].tasks.push({
//               id: taskId,
//               title: task.title,
//               time: workedToday,
//               estimatedTime: info.estimatedTime,
//               savedTime,
//               overtime,
//               startDate: info.startDate,
//               endDate: info.endDate,
//               status: info.status,
//             });
//           }

//           return {
//             taskId,
//             title: task.title,
//             time: workedToday,
//             estimatedTime: info.estimatedTime,
//             savedTime,
//             overtime,
//             status: info.status,
//           };
//         })
//         .filter(Boolean);

//       const totalTime = taskTimers.reduce((sum, t) => sum + (t?.time || 0), 0);

//       return {
//         date: dayKey,
//         time: totalTime,
//         status: totalTime > 0 ? "Worked" : "Not Worked",
//         tasks: taskTimers,
//       };
//     });

//     result.push({
//       id: user._id.toString(),
//       username: user.username,
//       email: user.email,
//       projects: Object.values(projectMap),
//       dayWise: dayWiseData,
//     });
//   }

//   return { users: result };
// },

userDayWiseAdmin: async ({
  startDate,
  endDate,
  userId,
}: {
  startDate: string | Date;
  endDate: string | Date;
  userId?: string;
}) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const userFilter = userId ? { _id: userId } : {}; 
  const users = await User.find({
  ...userFilter,
  role: { $ne: "superAdmin" }  
}).lean();


  const result: any[] = [];

  for (const user of users) {
    // --- Get tasks this user is assigned to ---
    const assignedTasks = await Task.find({ assignedUserId: user._id }).lean();
    const assignedTaskIds = assignedTasks.map((t) => t._id.toString());

    // --- Get timers where this user has worked ---
    const userTimers = await Timer.find({
      userId: user._id,
      startTime: { $gte: start, $lte: end },
    }).lean();

    // --- Collect all task IDs the user worked on (assigned or contributed) ---
    const workedTaskIds = [...new Set([...assignedTaskIds, ...userTimers.map((t) => t.taskId.toString())])];

    // --- Get details for all relevant tasks ---
    const allTasks = await Task.find({ _id: { $in: workedTaskIds } }).lean();
    const taskInfoMap: Record<string, any> = {};
    for (const task of allTasks) {
      taskInfoMap[task._id.toString()] = {
        projectId: task.projectId?.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
        endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
        status: task.status,
      };
    }

    const allTimers = await Timer.find({
      taskId: { $in: workedTaskIds.map((id) => new Types.ObjectId(id)) },
      startTime: { $gte: start, $lte: end },
    }).lean();

    const workedByTaskUserDate: Record<string, Record<string, Record<string, number>>> = {};
    for (const timer of allTimers) {
      const taskId = timer.taskId.toString();
      const uId = timer.userId.toString();
      const dayKey:any = new Date(timer.startTime).toISOString().split("T")[0];

      if (!workedByTaskUserDate[taskId]) workedByTaskUserDate[taskId] = {};
      if (!workedByTaskUserDate[taskId][uId]) workedByTaskUserDate[taskId][uId] = {};
      workedByTaskUserDate[taskId][uId][dayKey] =
        (workedByTaskUserDate[taskId][uId][dayKey] || 0) + (timer.duration || 0);
    }

    const projectMap: Record<string, any> = {};

    const dayWiseData = dates.map((date) => {
      const dayKey:any = date.toISOString().split("T")[0];
      const dayTasks: any[] = [];

      for (const taskId of workedTaskIds) {
        const info = taskInfoMap[taskId];
        if (!info) continue;

        const allUserWorkForDay = Object.values(workedByTaskUserDate[taskId] || {}).reduce(
          (sum, userWork) => sum + (userWork[dayKey] || 0),
          0
        );

        const workedToday = workedByTaskUserDate[taskId]?.[user._id.toString()]?.[dayKey] || 0;
        if (workedToday === 0) continue;

        const totalWorkedBefore = Object.values(workedByTaskUserDate[taskId] || {}).reduce(
          (sum, userWork) =>
            sum +
            Object.entries(userWork)
              .filter(([d]) => d < dayKey)
              .reduce((s, [, val]) => s + val, 0),
          0
        );

        const remainingEstimated = Math.max(info.estimatedTime - totalWorkedBefore, 0);
        const overtime = Math.max(allUserWorkForDay - remainingEstimated, 0);
        const savedTime = Math.max(info.estimatedTime - (totalWorkedBefore + allUserWorkForDay), 0);

        if (!projectMap[info.projectId]) {
          projectMap[info.projectId] = {
            id: info.projectId,
            name: null,
            description: null,
            tasks: [],
          };
        }

        const newTask = {
          taskId,
          id: taskId,
          title: info.title,
          time: workedToday,
          estimatedTime: info.estimatedTime,
          savedTime,
          overtime,
          startDate: info.startDate,
          endDate: info.endDate,
          status: info.status,
        };

        projectMap[info.projectId].tasks.push({ ...newTask });
        dayTasks.push({ ...newTask });
      }

      return {
        date: dayKey,
        time: dayTasks.reduce((sum, t) => sum + (t.time || 0), 0),
        status: dayTasks.length > 0 ? "Worked" : "Not Worked",
        tasks: [...dayTasks],
      };
    });

    // --- Fetch project names ---
    const projectIds = Object.keys(projectMap);
    if (projectIds.length > 0) {
      const projects = await Project.find({ _id: { $in: projectIds } }).lean();
      for (const project of projects) {
        const pid = project._id.toString();
        if (projectMap[pid]) {
          projectMap[pid].name = project.name;
          projectMap[pid].description = project.description;
        }
      }
    }

    result.push({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      projects: Object.values(projectMap),
      dayWise: dayWiseData,
    });
  }

  return { users: result };
},

userDayWiseAdminUser: async ({
  adminId,
  startDate,
  endDate,
}: {
  adminId: string;
  startDate: string | Date;
  endDate: string | Date;
}) => {
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  // Generate date range
  const dates: Date[] = [];
  let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Get users: all regular + admin
  const users = await User.find({ role: { $nin: ["superAdmin"] } }).lean();
  const adminUser = await User.findById(adminId).lean();
  if (!adminUser) throw new Error("Admin user not found");

  const combinedUsersMap: Record<string, any> = {};
  for (const u of users) combinedUsersMap[u._id.toString()] = u;
  combinedUsersMap[adminUser._id.toString()] = adminUser;
  const combinedUsers = Object.values(combinedUsersMap);

  // Fetch timers within range
  const allTimers = await Timer.find({ startTime: { $gte: start, $lte: end } }).lean();

  // Map: taskId -> userId -> day -> duration
  const taskTimersMap: Record<string, Record<string, Record<string, number>>> = {};
  for (const t of allTimers) {
    const taskId = t.taskId.toString();
    const userId = t.userId.toString();
    const dayKey:any = new Date(t.startTime).toISOString().split("T")[0];

    if (!taskTimersMap[taskId]) taskTimersMap[taskId] = {};
    if (!taskTimersMap[taskId][userId]) taskTimersMap[taskId][userId] = {};
    taskTimersMap[taskId][userId][dayKey] =
      (taskTimersMap[taskId][userId][dayKey] || 0) + (t.duration || 0);
  }

  const result: any[] = [];

  for (const user of combinedUsers) {
    // Tasks this user is assigned to or worked on
    const assignedTaskIds = await Task.find({ assignedUserId: user._id }).distinct("_id");
    const workedTaskIds = Object.keys(taskTimersMap).filter(
      (taskId) => taskTimersMap[taskId]?.[user._id.toString()]
    );
    const taskIds = Array.from(new Set([...assignedTaskIds, ...workedTaskIds]));

    const tasks = await Task.find({ _id: { $in: taskIds } }).lean();

    // Task metadata
    const taskInfoMap: Record<string, any> = {};
    for (const task of tasks) {
      taskInfoMap[task._id.toString()] = {
        id: task._id.toString(),
        projectId: task.projectId?.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
        endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
        status: task.status,
        assignedUserId: task.assignedUserId?.toString(),
      };
    }

    const projectMap: Record<string, any> = {};

    const dayWiseData = dates.map((date) => {
      const dayKey:any = date.toISOString().split("T")[0];
      const dayTasks: any[] = [];

      for (const task of tasks) {
        const taskId = task._id.toString();
        const info = taskInfoMap[taskId];
        if (!info) continue;

        // Work done by this user
        const workedToday = taskTimersMap[taskId]?.[user._id.toString()]?.[dayKey] || 0;
        if (workedToday === 0) continue;

        // --- Total work by all users for this task/day ---
        const allUserWorkForDay = Object.values(taskTimersMap[taskId] || {}).reduce(
          (sum, userWork) => sum + (userWork[dayKey] || 0),
          0
        );

        // --- Total work by all users before today ---
        const totalWorkedBefore = Object.values(taskTimersMap[taskId] || {}).reduce(
          (sum, userWork) =>
            sum +
            Object.entries(userWork)
              .filter(([d]) => d < dayKey)
              .reduce((s, [, val]) => s + val, 0),
          0
        );

        const remainingEstimated = Math.max(info.estimatedTime - totalWorkedBefore, 0);
        const overtime = Math.max(allUserWorkForDay - remainingEstimated, 0);
        const savedTime = Math.max(info.estimatedTime - (totalWorkedBefore + allUserWorkForDay), 0);

        // --- Organize project ---
        if (!projectMap[info.projectId]) {
          projectMap[info.projectId] = {
            id: info.projectId,
            name: null,
            description: null,
            tasks: [],
          };
        }

        const newTask = {
          id: info.id,
          taskId,
          title: info.title,
          time: workedToday,
          estimatedTime: info.estimatedTime,
          savedTime,
          overtime,
          status: info.status,
          assignedUserId: info.assignedUserId,
          startDate: info.startDate,
          endDate: info.endDate,
        };

        dayTasks.push(newTask);
        projectMap[info.projectId].tasks.push(newTask);
      }

      return {
        date: dayKey,
        time: dayTasks.reduce((s, t) => s + (t.time || 0), 0),
        status: dayTasks.length > 0 ? "Worked" : "Not Worked",
        tasks: dayTasks,
      };
    });

    // Fill project names
    const projectIds = Object.keys(projectMap);
    if (projectIds.length > 0) {
      const projects = await Project.find({ _id: { $in: projectIds } }).lean();
      for (const project of projects) {
        const pid = project._id.toString();
        if (projectMap[pid]) {
          projectMap[pid].name = project.name;
          projectMap[pid].description = project.description;
        }
      }
    }

    // Push final user summary
    result.push({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      projects: Object.values(projectMap).map((p) => ({
        ...p,
        tasks: p.tasks.map((t: any) => ({ ...t })),
      })),
      dayWise: dayWiseData.map((d) => ({
        ...d,
        tasks: d.tasks.map((t) => ({ ...t })),
      })),
    });
  }

  return { users: result };
}

};
