import client from "../lib/apolloClient";
import {jwtDecode} from "jwt-decode";
import { JwtPayload, UserDayWiseResponse } from "./interfaces";
import {
  GET_PROJECTS,
  USER_TASK,
  GET_TASKS,
  CREATE_PROJECT,
  DELETE_PROJECT,
  UPDATE_TASK_STATUS,
  CREATE_TASK,
  START_TIMER,
  DELETE_TASK,
  STOP_TIMER,
  UPDATE_TASK,
  REGISTRATION,
  LOGIN,
  GET_DAY_WISE_DATA,
  RESET,
  FORGOT,
  GET_USER_DAY_WISE,
  ADMINUSER_TIMESHEET,
  ALL_TIMESHEET,
  GET_ALL_USERS,
  GET_USERS,
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
  CHANGE_PASSWORD,
  VERIFY_OTP,
  RESEND_OTP,
  SCREEN_SHOT,
  GET_ADMIN_PROJECT,
  SUPERADMINCOUNT,
  TEAMLEADCOUNT,
  EMPCOUNT,
  EMPDATA,
  GET_USER_RELATIONS,
  GET_TEAM_LEADS,
  GET_USER_TL,
  MAILTL,
  USER
} from "./function";


// API Functions
export const getUser = async (userId: string) => {
  try {
    const res = await client.query({
      query: USER,
      variables: { userId },
    });

    return (res as any).data.user;
  } catch (err) {
    console.error("Failed to send mail to team leads:", err);
    throw err;
  }
};

export const sendMailToTeamLeads = async (userId: string) => {
  try {
    const res = await client.mutate({
      mutation: MAILTL,
      variables: { userId },
    });

    return (res as any).data.sendMailToTeamLeads;
  } catch (err) {
    console.error("Failed to send mail to team leads:", err);
    throw err;
  }
};

export const getUserTeamLead = async (id:string) => {
  try {
    const res = await client.query({
      query: GET_USER_TL,
      variables:{ id },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.getUserTeamLead;
  } catch (err) {
    console.error("Failed to fetch User Team Lead Data:", err);
    throw err;
  }
};

export const getTeamLeads = async (id?:string) => {
  try {
    const res = await client.query({
      query: GET_TEAM_LEADS,
      variables:{ id },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.getTeamLead;
  } catch (err) {
    console.error("Failed to fetch Team Lead Data:", err);
    throw err;
  }
};

export const getUserRelations = async (id: string) => {
  try {
    const res = await client.query({
      query: GET_USER_RELATIONS,
      variables: { id },
      fetchPolicy: "network-only",
    });

    return (res as any).data.getUserRelations;
  } catch (err) {
    console.error("Failed to fetch user relations:", err);
    throw err;
  }
};
// API Functions
export const getEmpData = async (userId: string) => {
  try {
    const res = await client.query({
      query: EMPDATA,
      variables: { userId },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.empGet;
  } catch (err) {
    console.error("Failed to fetch User Data:", err);
    throw err;
  }
};
export const getEmpDashboardCount = async (userId: string) => {
  try {
    const res = await client.query({
      query: EMPCOUNT,
      variables: { userId },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.empDashboardCount;
  } catch (err) {
    console.error("Failed to fetch Employee Dashboard Count:", err);
    throw err;
  }
};
export const getTeamLeadDashboardCount = async (userId: string) => {
  try {
    const res = await client.query({
      query: TEAMLEADCOUNT,
      variables: { userId },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.teamLeadDashboardCount;
  } catch (err) {
    console.error("Failed to fetch Team Lead Dashboard Count:", err);
    throw err;
  }
};
export const getSuperAdminDashboardCount = async () => {
  try {
    const res = await client.query({
      query: SUPERADMINCOUNT,
      fetchPolicy: "network-only", 
    });

    return (res as any).data.superAdminDashboardCount;
  } catch (err) {
    console.error("Failed to fetch Super Admin Dashboard Count:", err);
    throw err;
  }
};
export const getAdminProjects = async (userId: string) => {
  const res = await client.query({
    query: GET_ADMIN_PROJECT,
    variables: { userId },
    fetchPolicy: "network-only", 
  });

  return (res as any).data.adminsprojects;
};

export const forgotPassword = async (email: string) => {
  const res = await client.mutate({
    mutation: FORGOT,
    variables: { email },
  });
  return (res as any).data.forgotPassword;
};

export const resetPassword = async (token: string, newPassword: string) => {
  const res = await client.mutate({
    mutation: RESET,
    variables: { token, newPassword },
  });
  return (res as any).data.resetPassword;
};

export const getUserScreenshots = async (userId: string) => {
  if (!userId) throw new Error("Missing userId");

  try {
    const res = await client.query({
      query: SCREEN_SHOT,
      variables: { userId },
      fetchPolicy: "network-only", 
    });

    return (res as any).data.screenshotsByUser;
  } catch (err) {
    console.error("Failed to fetch screenshots", err);
    throw err;
  }
};

export const verifyOtp = async (email: string, otp: string) => {
  const res = await client.mutate({
    mutation: VERIFY_OTP,
    variables: { email, otp },
  });

  return (res as any).data.verifyOtp;
};

export const resendOtp = async (email: string) => {
  const res = await client.mutate({
    mutation: RESEND_OTP,
    variables: { email },
  });

  return (res as any).data.resendOTP;
};
export const changePassword = async (id: string, oldPassword: string, newPassword: string) => {
  const res = await client.mutate({
    mutation: CHANGE_PASSWORD,
    variables: { id, oldPassword, newPassword },
  });

  return (res as any).data.changePassword;
};
export const deleteUser = async (id: string) => {
  const res = await client.mutate({
    mutation: DELETE_USER,
    variables: { id },
  });
  return (res as any).data.deleteUser;
};
export const updateUser = async (userData: {
  id: string;
  username?: string;
  email?: string;
  role?: string;
}) => {
  const res = await client.mutate({
    mutation: UPDATE_USER,
    variables: {...userData},
  });
  return (res as any).data.updateUser;
};
export const createUser = async (userData: {
  username: string;
  email: string;
  role?: string;
}) => {
  const res = await client.mutate({
    mutation: CREATE_USER,
    variables: userData,
  });
  return (res as any).data.createUser;
};

export const getAllUsers = async () => {
  const res = await client.query({
    query: GET_ALL_USERS,
    fetchPolicy: "network-only",
  });
  return (res as any).data.allusers;
};
export const getUsers = async () => {
  const res = await client.query({
    query: GET_USERS,
    fetchPolicy: "network-only",
  });
  return (res as any).data.users;
};
export const getProjects = async () => {
  const res = await client.query({ query: GET_PROJECTS,fetchPolicy: "network-only", });
  return (res as any).data.projects;
};

export const getTasksByProject = async (projectId: string) => {
  const res = await client.query({
    query: GET_TASKS,
    variables: { projectId },
    fetchPolicy: "no-cache",
  });
  return (res as any).data.tasks;
};

export const createProject = async (name: string, description?: string) => {
  const res = await client.mutate({
    mutation: CREATE_PROJECT,
    variables: { name, description },
  });
  return (res as any).data.createProject;
};

export const deleteProject = async (id: string) => {
  const res = await client.mutate({
    mutation: DELETE_PROJECT,
    variables: { id },
  });
  return (res as any).data.deleteProject; // returns true
};

export const createTask = async (projectId: string, title: string) => {
  const res = await client.mutate({
    mutation: CREATE_TASK,
    variables: { projectId, title },
  });
  return (res as any).data.createTask; 
};

export const startTimer = async (taskId: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const decoded = jwtDecode<JwtPayload>(token);
  const userId = decoded.id;

  const res = await client.mutate({
    mutation: START_TIMER,
    variables: { taskId, userId },
  });

  return (res as any).data.startTimer;
};

export const stopTimer = async (taskId: string) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("No token found");

  const decoded = jwtDecode<JwtPayload>(token);
  const userId = decoded.id;

  const res = await client.mutate({
    mutation: STOP_TIMER,
    variables: { taskId, userId },
  });

  return (res as any).data.stopTimer; // returns timer info
};

export const deleteTask = async (id: string) => {
  const res = await client.mutate({
    mutation: DELETE_TASK,
    variables: { id },
  });
  return (res as any).data.deleteTask; 
};

export const createTaskAdmin = async (
  projectId: string,
  title: string,
  estimatedTime?: number,
  assignedUserId?: string,
  startDate?: string,
  endDate?: string
) => {
  const res = await client.mutate({
    mutation: CREATE_TASK,
    variables: { projectId, title, estimatedTime, assignedUserId,startDate,
      endDate },
  });
  return (res as any).data.createTask;
};

export const updateTaskAdmin = async (
id: string, title?: string, estimatedTime?: number, assignedUserId?: string, startDate?: string, endDate?: string, status?: string) => {
  const res = await client.mutate({
    mutation: UPDATE_TASK,
    variables: { id, title, estimatedTime, assignedUserId,startDate,endDate },
  });
  return (res as any).data.updateTask;
};

  
 export const login=async (email?:string,password?:string)=>{
     const res =await client.mutate({
      mutation:LOGIN,
      variables:{email,password},
     })    
     return (res as any).data.login
 }

  export const register=async (email?:string,password?:string,username?:string)=>{
     const res =await client.mutate({
      mutation:REGISTRATION,
      variables:{email,password,username},
     })

     return (res as any).data.register
 }

export const getUserTasks = async () => {
  const token = localStorage.getItem("token");
  if (!token) return [];

  const parsed = jwtDecode<JwtPayload>(token)
  const userId = parsed.id; 

  const res = await client.query({
    query: USER_TASK,
    variables: { userId },
    fetchPolicy: "no-cache", 
  });

  return (res as any).data.tasksForUser;
};

export const getDayWiseData = async ({
  projectId,
  userIds,
  startDate,
  endDate,
}: {
  projectId: string;
  userIds: string[];
  startDate: string;
  endDate: string;
}) => {
  const res = await client.query({
    query: GET_DAY_WISE_DATA,
    variables: { projectId, userIds, startDate, endDate },
    fetchPolicy: "no-cache",
  });

  return (res as any).data.dayWiseData;
};

export const getUserDayWise = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserDayWiseResponse | null> => {
  try {
    const { data } = await client.query({
      query: GET_USER_DAY_WISE,
      variables: { userId, startDate, endDate },
      fetchPolicy: 'no-cache',
    });

    return (data as any).userDayWise;
  } catch (error) {
    console.error('Error fetching user day-wise data:', error);
    return null;
  }
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const res = await client.mutate({
    mutation: UPDATE_TASK_STATUS,
    variables: { taskId, status },
  });
  return (res as any).data.updateTaskStatus;
};

export const getAllTimesheet = async (
  startDate: string,
  endDate: string,
  userId?: string // 👈 added optional user filter
) => {
  const res = await client.query({
    query: ALL_TIMESHEET,
    variables: { startDate, endDate, userId }, // 👈 send userId to backend if given
    fetchPolicy: "network-only",
  });

  const users = (res as any)?.data?.userDayWiseAdmin?.users || [];

  const safeUsers = (users as any).map((u: any, userIndex: number) => {
    // --- Clone projects ---
    const clonedProjects = (u.projects || []).map((p: any, projIndex: number) => {
      const cloned = JSON.parse(JSON.stringify(p));
      cloned._uniqueKey = `${u.id || userIndex}-${p.id || projIndex}`;
      cloned.tasks = (cloned.tasks || []).map((t: any) => ({
        ...t,
        startDate: t.startDate ? new Date(Number(t.startDate)).toISOString() : null,
        endDate: t.endDate ? new Date(Number(t.endDate)).toISOString() : null,
      }));
      return cloned;
    });

    // --- Clone dayWise and its tasks (no sharing between users) ---
    const clonedDayWise = (u.dayWise || []).map((d: any, dIndex: number) => ({
      ...d,
      tasks: (d.tasks || []).map((t: any, tIndex: number) => ({
        ...t,
        startDate: t.startDate ? new Date(Number(t.startDate)).toISOString() : null,
        endDate: t.endDate ? new Date(Number(t.endDate)).toISOString() : null,
        _uniqueKey: `${u.id || userIndex}-day${dIndex}-task${tIndex}`,
      })),
    }));

    return {
      ...u,
      projects: clonedProjects,
      dayWise: clonedDayWise,
    };
  });

  return safeUsers;
};


export const getAdminUserTimesheet = async (
  adminId: string,
  startDate: string,
  endDate: string
) => {
  const res = await client.query({
    query: ADMINUSER_TIMESHEET,
    variables: { adminId, startDate, endDate },
    fetchPolicy: "network-only",
  });

  const users = (res as any)?.data?.userDayWiseAdminUser?.users || [];

  const safeUsers = users.map((u: any, userIndex: number) => {
    // Clone projects deeply
    const clonedProjects = (u.projects || []).map((p: any, projIndex: number) => {
      const cloned = JSON.parse(JSON.stringify(p));
      cloned._uniqueKey = `${u.id || userIndex}-${p.id || projIndex}`;
      cloned.tasks = (cloned.tasks || []).map((t: any) => ({
        ...t,
        startDate: t.startDate ? new Date(Number(t.startDate)).toISOString() : null,
        endDate: t.endDate ? new Date(Number(t.endDate)).toISOString() : null,
      }));
      return cloned;
    });

    // Clone dayWise deeply
    const clonedDayWise = (u.dayWise || []).map((d: any, dIndex: number) => ({
      ...d,
      tasks: (d.tasks || []).map((t: any, tIndex: number) => ({
        ...t,
        startDate: t.startDate ? new Date(Number(t.startDate)).toISOString() : null,
        endDate: t.endDate ? new Date(Number(t.endDate)).toISOString() : null,
        _uniqueKey: `${u.id || userIndex}-day${dIndex}-task${tIndex}`,
      })),
    }));

    return {
      ...u,
      projects: clonedProjects,
      dayWise: clonedDayWise,
    };
  });

  return safeUsers;
};

// export const getAllTimesheet = async (startDate: string, endDate: string) => {
//   const res = await client.query({
//     query: ALL_TIMESHEET,
//     variables: { startDate, endDate },
//     fetchPolicy: "network-only",
//   });

//   const users = (res as any)?.data?.userDayWiseAdmin?.users || [];
//   console.log("Raw API Response:", JSON.stringify(users, null, 2));

//   const safeUsers = (users as any).map((u: any, userIndex: number) => {
//     const clonedProjects = (u.projects || []).map((p: any, projIndex: number) => {
//       const cloned = structuredClone ? structuredClone(p) : JSON.parse(JSON.stringify(p));
//       cloned._uniqueKey = `${u.id}-${p.id}-${projIndex}`;
//       cloned.tasks = (cloned.tasks || []).map((t: any, tIndex: number) => ({
//         ...structuredClone ? structuredClone(t) : JSON.parse(JSON.stringify(t)),
//         startDate: normalizeDate(t.startDate),
//         endDate: normalizeDate(t.endDate),
//         _uniqueKey: `${u.id}-${p.id}-task-${t.id || tIndex}`,
//       }));
//       return cloned;
//     });

//     const clonedDayWise = (u.dayWise || []).map((d: any, dIndex: number) => ({
//       ...structuredClone ? structuredClone(d) : JSON.parse(JSON.stringify(d)),
//       tasks: (d.tasks || []).map((t: any, tIndex: number) => ({
//         ...structuredClone ? structuredClone(t) : JSON.parse(JSON.stringify(t)),
//         startDate: normalizeDate(t.startDate),
//         endDate: normalizeDate(t.endDate),
//         _uniqueKey: `${u.id}-day${dIndex}-task${t.taskId || tIndex}`,
//       })),
//     }));

//     return {
//       ...structuredClone ? structuredClone(u) : JSON.parse(JSON.stringify(u)),
//       id: u.id,
//       _uniqueKey: `${u.id}-${userIndex}`,
//       projects: clonedProjects,
//       dayWise: clonedDayWise,
//     };
//   });

//   console.log("Processed safeUsers:", JSON.stringify(safeUsers, null, 2));
//   return safeUsers;
// };

// function normalizeDate(val: any): string | null {
//   if (!val) return null;
//   try {
//     if (typeof val === "number" || !isNaN(Number(val))) return new Date(Number(val)).toISOString();
//     const d = new Date(val);
//     if (!isNaN(d.getTime())) return d.toISOString();
//   } catch (e) {}
//   return null;
// }

