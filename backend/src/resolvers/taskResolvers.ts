import mongoose from "mongoose";
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
      let runningTimerData = null;

      if (runningTimer) {
        runningDuration = Math.floor(
          (new Date().getTime() - new Date(runningTimer.startTime).getTime()) / 1000
        );
        // Map runningTimer to match GraphQL Timer type
        runningTimerData = {
          id: runningTimer._id.toString(),          // required
          taskId: runningTimer.taskId.toString(),   // required
          startTime: runningTimer.startTime.toISOString(), // required
          endTime: runningTimer.endTime ? runningTimer.endTime.toISOString() : null,
          duration: runningTimer.duration || 0,
        };
      }

      return {
        id: task._id.toString(),
        projectId: task.projectId.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime,
        status: task.status,
        totalTime: totalCompleted + runningDuration,
        isRunning: !!runningTimer,
        runningTimer: runningTimerData,
        overtime: (task as any).overtime || 0,
        savedTime: (task as any).savedTime || 0,
        startDate: formatDate((task as any).startDate) || "",
        endDate: formatDate((task as any).endDate) || "",
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
  createTask: async ({ projectId, title, estimatedTime, assignedUserId, startDate, endDate }: any) => {
  let validProjectId = projectId;

  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    const sharedProject = await getOrCreateDefaultProject();
    validProjectId = sharedProject._id;
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
      startDate:(task as any).startDate,
      endDate:(task as any).endDate,
      status:task.status,
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

  // Generate all dates in range (UTC-safe)
  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Fetch tasks for this project and users
  const tasks = await Task.find({
    projectId: new mongoose.Types.ObjectId(projectId),
    assignedUserId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const taskIds = tasks.map((t) => t._id.toString());

  // Create a map of task info
  const taskInfoMap: Record<
    string,
    {
      userId: string;
      estimatedTime: number;
      title: string;
      startDate?: Date | undefined;
      endDate?: Date | undefined;
    }
  > = {};
  tasks.forEach((t) => {
    if (t.assignedUserId) {
      taskInfoMap[(t as any)._id.toString()] = {
        userId: t.assignedUserId.toString(),
        estimatedTime: t.estimatedTime || 0,
        title: t.title,
        startDate: (t as any).startDate ? new Date((t as any).startDate) : undefined,
        endDate: (t as any).endDate ? new Date((t as any).endDate) : undefined,
      };
    }
  });

  // Fetch timers
  const timers = await Timer.find({
    taskId: { $in: taskIds },
  }).lean();

  // Precompute worked time per task grouped by date
  const workedByTaskByDate: Record<string, Record<string, number>> = {};
  timers.forEach((t: any) => {
    const taskId = t.taskId.toString();
    const d = new Date(t.startTime);
    const dayKey = d.toISOString().split("T")[0];
    workedByTaskByDate[taskId] = workedByTaskByDate[taskId] || {};
    workedByTaskByDate[taskId][(dayKey as any)] = (workedByTaskByDate[taskId][(dayKey as any)] || 0) + (t.duration || 0);
  });

  // Build day-wise data
  const dayWiseData = dates.map((date) => {
    const dayKey = date.toISOString().split("T")[0];

    return {
      date: dayKey,
      users: userIds.map((userId) => {
        const userTasks = tasks.filter((task) => task.assignedUserId?.toString() === userId);

        const taskTimers = userTasks
  .map((task) => {
    const taskId = task._id.toString();
    const taskInfo = taskInfoMap[taskId];
    if (!taskInfo) return null;
    const status = task.status
    const estimated = taskInfo.estimatedTime || 0;
    const workedToday = workedByTaskByDate[taskId]?.[(dayKey as any)] || 0;

    if (workedToday === 0) return null;

    // Total worked before today
    const totalWorkedBefore = Object.entries(workedByTaskByDate[taskId] || {})
      .filter(([d]) => d < (dayKey as any))
      .reduce((sum, [, val]) => sum + val, 0);

    // Remaining estimated for today
    const remainingEstimated = Math.max(estimated - totalWorkedBefore, 0);

    const overtime = Math.max(workedToday - remainingEstimated, 0);
    const savedTime = Math.max(estimated - (totalWorkedBefore + workedToday), 0);

    return {
      taskId,
      title: task.title,
      time: workedToday,
      estimatedTime: estimated,
      savedTime,
      overtime,
      status,
    };
  })
  .filter(Boolean);



        const totalTime = taskTimers.reduce((sum, t) => sum + (t?.time || 0), 0);

        return {
          userId,
          time: totalTime,
          status: totalTime > 0 ? "Worked" : "Not Worked",
          tasks: taskTimers,
        };
      }),
    };
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
  const end = new Date(endDate);

  // Generate all dates in range (UTC-safe)
  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // Fetch all tasks assigned to the user
  const tasks = await Task.find({ assignedUserId: userId }).lean();
  const taskIds = tasks.map((t) => t._id.toString());

  // Map task info
  const taskInfoMap: Record<
    string,
    {
      projectId: string;
      title: string;
      estimatedTime: number;
      startDate?: Date | undefined;
      endDate?: Date | undefined;
    }
  > = {};
  for (const task of tasks) {
    taskInfoMap[(task as any)._id.toString()] = {
      projectId: (task.projectId as any).toString(),
      title: task.title,
      estimatedTime: task.estimatedTime || 0,
      startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
      endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
    };
  }

  // Fetch all timers for the user's tasks
  const timers = await Timer.find({ taskId: { $in: taskIds } }).lean();

  // Precompute worked time per task grouped by date
  const workedByTaskByDate: Record<string, Record<string, number>> = {};
  timers.forEach((t: any) => {
    const taskId = t.taskId.toString();
    const d = new Date(t.startTime);
    const dayKey = d.toISOString().split("T")[0];
    workedByTaskByDate[taskId] = workedByTaskByDate[taskId] || {};
    workedByTaskByDate[taskId][(dayKey as any)] = (workedByTaskByDate[taskId][(dayKey as any)] || 0) + (t.duration || 0);
  });

  // Fetch projects
  const projectIds = Array.from(new Set(tasks.map(t => (t.projectId as any).toString())));
  const projects = await Project.find({ _id: { $in: projectIds } }).lean();
  const projectMap: Record<string, any> = {};
  for (const project of projects) {
    projectMap[(project as any)._id.toString()] = {
      id: (project as any)._id.toString(),
      name: project.name,
      description: project.description,
      tasks: [],
    };
  }

  // Build day-wise data
  const dayWiseData = dates.map((date) => {
    const dayKey = date.toISOString().split("T")[0];

    // Compute tasks for today
    const taskTimers = tasks
  .map((task) => {
    const taskId = task._id.toString();
    const taskInfo = taskInfoMap[taskId];
    if (!taskInfo) return null;

    const estimated = taskInfo.estimatedTime || 0;
    const workedToday = workedByTaskByDate[taskId]?.[(dayKey as any)] || 0;
    if (workedToday === 0) return null;

    const totalWorkedBefore = Object.entries(workedByTaskByDate[taskId] || {})
      .filter(([d]) => d < (dayKey as any))
      .reduce((sum, [, val]) => sum + val, 0);

    const remainingEstimated = Math.max(estimated - totalWorkedBefore, 0);
    const overtime = Math.max(workedToday - remainingEstimated, 0);
    const savedTime = Math.max(estimated - (totalWorkedBefore + workedToday), 0);

    if (projectMap[taskInfo.projectId]) {
      projectMap[taskInfo.projectId].tasks.push({
        id: taskId,
        title: task.title,
        time: workedToday,
        estimatedTime: estimated,
        savedTime,
        overtime,
        startDate: taskInfo.startDate,
        endDate: taskInfo.endDate,
        status: task.status,
      });
    }

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
  .filter(Boolean);


    const totalTime = taskTimers.reduce((sum, t) => sum + (t?.time || 0), 0);

    return {
      date: dayKey,
      time: totalTime,
      status: totalTime > 0 ? "Worked" : "Not Worked",
      tasks: taskTimers,
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

userDayWiseAdmin: async ({ startDate, endDate }: { startDate: string | Date; endDate: string | Date }) => {
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

  // const users = await User.find({role :{$ne:"admin"}}).lean();
  const users = await User.find().lean();
  const result = [];

  for (const user of users) {
    // ✅ isolate every user cleanly
    const tasks = await Task.find({ assignedUserId: user._id }).lean();
    const taskIds = tasks.map((t) => t._id.toString());

    // --- task info map per user ---
    const taskInfoMap: Record<string, any> = {};
    for (const task of tasks) {
      taskInfoMap[task._id.toString()] = {
        projectId: task.projectId?.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
        endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
        status: task.status,
      };
    }

    // --- timers per user ---
    const timers = await Timer.find({
      taskId: { $in: taskIds },
      startTime: { $gte: start, $lte: end },
    }).lean();

    const workedByTaskByDate: Record<string, Record<string, number>> = {};
    for (const t of timers) {
      const taskId = t.taskId.toString();
      const dayKey = new Date(t.startTime).toISOString().split("T")[0];
      if (!workedByTaskByDate[taskId]) workedByTaskByDate[taskId] = {};
      workedByTaskByDate[taskId][(dayKey as any)] = (workedByTaskByDate[taskId][(dayKey as any)] || 0) + (t.duration || 0);
    }

    // ✅ Create a *new* project map per user, per request
    const projectMap: Record<string, any> = {};

    const dayWiseData = dates.map((date) => {
      const dayKey = date.toISOString().split("T")[0];
      const dayTasks: any[] = [];

      for (const task of tasks) {
        const taskId = task._id.toString();
        const info = taskInfoMap[taskId];
        if (!info) continue;

        const workedToday = workedByTaskByDate[taskId]?.[(dayKey as any)] || 0;
        if (workedToday === 0) continue;

        const totalWorkedBefore = Object.entries(workedByTaskByDate[taskId] || {})
          .filter(([d]) => d < (dayKey as any))
          .reduce((sum, [, val]) => sum + val, 0);

        const remainingEstimated = Math.max(info.estimatedTime - totalWorkedBefore, 0);
        const overtime = Math.max(workedToday - remainingEstimated, 0);
        const savedTime = Math.max(info.estimatedTime - (totalWorkedBefore + workedToday), 0);

        // ✅ New isolated project map entry per user
        if (!projectMap[info.projectId]) {
          projectMap[info.projectId] = {
            id: info.projectId,
            name: null,
            description: null,
            tasks: [],
          };
        }

        // ✅ Deep push — no shared reference
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
        time: dayTasks.reduce((s, t) => s + (t.time || 0), 0),
        status: dayTasks.length > 0 ? "Worked" : "Not Worked",
        tasks: [...dayTasks],
      };
    });

    // ✅ Load project info cleanly
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

    // ✅ Deep isolate this user completely
    const userProjects = Object.values(projectMap).map((p: any) => ({
      ...p,
      tasks: p.tasks.map((t: any) => ({ ...t })),
    }));

    result.push({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      projects: userProjects,
      dayWise: dayWiseData.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t })) })),
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

  const dates: Date[] = [];
  const current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUTC = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (current <= endUTC) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  // ✅ Fetch all users
  const users = await User.find({ role: { $nin: ["admin", "superAdmin"] } }).lean();


  // ✅ Fetch the adminId user separately to ensure inclusion
  const adminUser = await User.findById(adminId).lean();
  if (!adminUser) throw new Error("Admin user not found");

  // ✅ Combine users and adminId user, remove duplicates
  const combinedUsersMap: Record<string, any> = {};
  for (const u of users) combinedUsersMap[u._id.toString()] = u;
  combinedUsersMap[adminUser._id.toString()] = adminUser; // overwrite if duplicate

  const combinedUsers = Object.values(combinedUsersMap);
  const result: any[] = [];

  for (const user of combinedUsers) {
    const tasks = await Task.find({ assignedUserId: user._id }).lean();
    const taskIds = tasks.map((t) => t._id.toString());

    const taskInfoMap: Record<string, any> = {};
    for (const task of tasks) {
      taskInfoMap[task._id.toString()] = {
        projectId: task.projectId?.toString(),
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        startDate: (task as any).startDate ? new Date((task as any).startDate) : undefined,
        endDate: (task as any).endDate ? new Date((task as any).endDate) : undefined,
        status: task.status,
      };
    }

    const timers = await Timer.find({
      taskId: { $in: taskIds },
      startTime: { $gte: start, $lte: end },
    }).lean();

    const workedByTaskByDate: Record<string, Record<string, number>> = {};
    for (const t of timers) {
      const taskId = t.taskId.toString();
      const dayKey: any = new Date(t.startTime).toISOString().split("T")[0];
      if (!workedByTaskByDate[taskId]) workedByTaskByDate[taskId] = {};
      workedByTaskByDate[taskId][dayKey] = (workedByTaskByDate[taskId][dayKey] || 0) + (t.duration || 0);
    }

    const projectMap: Record<string, any> = {};

    const dayWiseData = dates.map((date) => {
      const dayKey: any = date.toISOString().split("T")[0];
      const dayTasks: any[] = [];

      for (const task of tasks) {
        const taskId = task._id.toString();
        const info = taskInfoMap[taskId];
        if (!info) continue;

        const workedToday = workedByTaskByDate[taskId]?.[dayKey] || 0;
        if (workedToday === 0) continue;

        const totalWorkedBefore = Object.entries(workedByTaskByDate[taskId] || {})
          .filter(([d]) => d < dayKey)
          .reduce((sum, [, val]) => sum + val, 0);

        const remainingEstimated = Math.max(info.estimatedTime - totalWorkedBefore, 0);
        const overtime = Math.max(workedToday - remainingEstimated, 0);
        const savedTime = Math.max(info.estimatedTime - (totalWorkedBefore + workedToday), 0);

        if (!projectMap[info.projectId]) {
          projectMap[info.projectId] = { id: info.projectId, name: null, description: null, tasks: [] };
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
        time: dayTasks.reduce((s, t) => s + (t.time || 0), 0),
        status: dayTasks.length > 0 ? "Worked" : "Not Worked",
        tasks: [...dayTasks],
      };
    });

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

    const userProjects = Object.values(projectMap).map((p: any) => ({
      ...p,
      tasks: p.tasks.map((t: any) => ({ ...t })),
    }));

    result.push({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      projects: userProjects,
      dayWise: dayWiseData.map((d) => ({ ...d, tasks: d.tasks.map((t) => ({ ...t })) })),
    });
  }

  return { users: result };
}
};
