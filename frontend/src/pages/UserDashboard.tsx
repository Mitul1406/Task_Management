"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  changePassword,
  getUserTasks,
  startTimer,
  stopTimer,
  updateTaskStatus,
} from "../services/api";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useSidebar } from "../context/SideBarContext";
import AutoScreenshot from "./ScreenShot";
import CreateTaskModal from "../components/CreateTaskModal";
import NotificationPermissionBanner, { notifyUser } from "../components/notifyUser";

interface Task {
  status: string;
  id: string;
  title: string;
  estimatedTime: number;
  totalTime: number;
  isRunning: boolean;
  runningTimer: { id: string; startTime: string; endTime?: string } | null;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  tasks: Task[];
}

const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
  done: { label: "Done", bgColor: "#2bc22bff" },
};

const UserDashboard: React.FC = () => {
  const { logout } = useSidebar();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const intervalsRef = useRef<{ [taskId: string]: NodeJS.Timer }>({});
  const [username, setUsername] = useState<string>("");
  const [id, setId] = useState<string>("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const navigate = useNavigate();
  const screenshotRef = useRef<any>(null); // 👈 added for screen permission ref

  interface User {
    id: string;
    username: string;
    email: string;
    role: string;
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const parsed = jwtDecode<User>(token);
      setId(parsed.id || "");
      setUsername(parsed.username || "");
    }
  }, []);

  useEffect(() => {
    fetchUserTasks();
  }, [showTaskModal]);
  const handlePasswordChange = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  try {
    const res = await changePassword(id, oldPassword, newPassword);

    if (res.success) {
      toast.success(res.message);
      setOldPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
    } else {
      toast.error(res.message);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    toast.error("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // Stop timers if tab/window closes
  useEffect(() => {
    const handleBeforeUnload = async () => {
      const runningTasks = projects
        .flatMap((project) =>
          project.tasks.map((t) => ({ ...t, projectId: project.id }))
        )
        .filter((task) => task.isRunning);

      for (const task of runningTasks) {
        try {
          await stopTimer(task.id);
          clearInterval(intervalsRef.current[task.id]);
          delete intervalsRef.current[task.id];
          // toast.warn(`Timer stopped because the page was reloaded or closed.`);

        notifyUser(
          "Timer Stopped",
          "Your timer stopped because the page was refreshed or closed."
        );
        } catch (err) {
          console.error("Error stopping timer before unload:", err);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [projects]);

  const fetchUserTasks = async () => {
    const data = await getUserTasks();
    const updated = data.map((project: Project) => ({
      ...project,
      tasks: project.tasks.map((t) => ({
        ...t,
        runningDuration: t.isRunning ? 0 : undefined,
      })),
    }));
    setProjects(updated);
  };

  const formatDate = (val: any) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const n = Number(val);
    if (isNaN(n)) return "";
    return new Date(n).toISOString().split("T")[0];
  };

  const toggleExpandProject = (projectId: string) => {
    setExpandedProject((prev) => (prev === projectId ? null : projectId));
  };

  // ✅ Handle screen share stop — stop all running timers
  const projectsRef = useRef(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const handleScreenShareStopped = useCallback(async () => {

    const runningTasks = projectsRef.current.flatMap((project) =>
      project.tasks
        .filter((task) => task.isRunning)
        .map((task) => ({ ...task, projectId: project.id }))
    );

    if (runningTasks.length === 0) return;

    for (const task of runningTasks) {
      try {
        await stopTimer(task.id);
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];
        toast.warn(`Timer stopped because screen sharing was ended.`);
        notifyUser("Timer Stopped","Your timer stopped because screen sharing was ended.Visit website now.")
      } catch (err) {
        console.error(`Failed to stop timer for task ${task.id}`, err);
      }
    }

    const refreshed = await getUserTasks();
    setProjects(refreshed);
  }, []);

const handleStartStopTimer = async (task: Task, projectId: string) => {
  if (task.isRunning) {
    await stopTimer(task.id);
    clearInterval(intervalsRef.current[task.id]);
    delete intervalsRef.current[task.id];

    const refreshedProjects = await getUserTasks();
    setProjects(refreshedProjects);
    return;
  }

  // ✅ Check if permission already granted
  const alreadyGranted = screenshotRef.current?.hasPermission;
  let granted = alreadyGranted;

  if (!alreadyGranted) {
    granted = await screenshotRef.current?.requestScreenShare?.();
  }

  if (!granted) {
    toast.error("You must share your ENTIRE SCREEN to start a task.");
    return;
  }

  // ✅ Start the task
  const res=await startTimer(task.id);
     if(!res.success)
     {
      const msg=res.message
      toast.error(msg)
      return
     }
  const updatedTask = await updateTaskStatus(task.id, "in_progress");

  setProjects((prev) =>
    prev.map((project) =>
      project.id === projectId
        ? {
            ...project,
            tasks: project.tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    isRunning: true,
                    runningDuration: 0,
                    status: updatedTask.status,
                  }
                : t
            ),
          }
        : project
    )
  );

  // Timer update logic
  intervalsRef.current[task.id] = setInterval(() => {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId
          ? {
              ...project,
              tasks: project.tasks.map((t) =>
                t.id === task.id
                  ? {
                      ...t,
                      runningDuration:
                        (t as any).runningDuration !== undefined
                          ? (t as any).runningDuration + 1
                          : 1,
                    }
                  : t
              ),
            }
          : project
      )
    );
  }, 1000);
};

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleStatusClick = async (taskId: string, projectId: string) => {
    const task = projects
      .find((p) => p.id === projectId)
      ?.tasks.find((t) => t.id === taskId);

    if (!task) return;

    const confirmUpdate = window.confirm(
      `Are you sure you want to change the status of "${task.title}" to code_review?`
    );
    if (!confirmUpdate) return;

    setProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === projectId
          ? {
              ...proj,
              tasks: proj.tasks.map((t) =>
                t.id === taskId ? { ...t, status: "code_review" } : t
              ),
            }
          : proj
      )
    );

    try {
      await updateTaskStatus(taskId, "code_review");
      toast.success("Status updated to code_review");
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
      setProjects((prevProjects) =>
        prevProjects.map((proj) =>
          proj.id === projectId
            ? {
                ...proj,
                tasks: proj.tasks.map((t) =>
                  t.id === taskId ? { ...t, status: task.status } : t
                ),
              }
            : proj
        )
      );
    }
  };

  return (
    <div className="container mt-4">
      <NotificationPermissionBanner/>
      {/* 👇 now ref is passed to AutoScreenshot */}
      <AutoScreenshot ref={screenshotRef} onPermissionDenied={handleScreenShareStopped} />

      {/* Password modal */}
      {showPasswordForm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="bg-white p-4 rounded shadow" style={{ width: "320px" }}>
            <h5 className="text-center mb-3">Change Password</h5>
            <form onSubmit={handlePasswordChange}>
              <div className="mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="Old Password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <input
                  type="password"
                  className="form-control"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowPasswordForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dashboard header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        {/* <h2>Welcome: {username}</h2> */}
        <div className="d-flex ms-auto">
          {/* <button
            className="btn btn-sm btn-success me-2"
            onClick={() => window.open(`/user-timesheet-report/${id}`, "_blank")}
          >
            View Timesheet
          </button>

          <button
            className="btn btn-sm me-2"
            style={{ background: "violet", color: "white" }}
            onClick={() => window.open(`/screenshots/${id}`, "_blank")}
          >
            View ScreenShot
          </button> */}

          <button
            className="btn btn-primary btn-sm me-2"
            onClick={() => setShowTaskModal(true)}
          >
            Create Your Own Task
          </button>
          <CreateTaskModal show={showTaskModal} onClose={() => setShowTaskModal(false)} fetchUserTask={()=>{}} />

          {/* <button
            className="btn btn-sm btn-warning me-2"
            onClick={() => setShowPasswordForm(true)}
          >
            Change Password
          </button> */}

          {/* <button
            className="btn btn-danger"
            onClick={() => {
              logout();
              localStorage.removeItem("token");
              toast.success("Logout successfully...");
              navigate("/login");
            }}
          >
            Logout
          </button> */}
        </div>
      </div>

      {/* Project List */}
      <h1 className="text-center">Task Tracker</h1>
      {projects.map((project) => (
        <div key={project.id} className="card mb-3" onClick={() => toggleExpandProject(project.id)}>
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{project.name}</strong>
              {project.description && <p className="mb-0">{project.description}</p>}
            </div>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-sm btn-info"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpandProject(project.id);
                }}
              >
                {expandedProject === project.id ? "Collapse" : "View Tasks"}
              </button>
            </div>
          </div>

          {expandedProject === project.id && (
            <div className="card-body">
              {project.tasks.length === 0 && <p>No tasks assigned.</p>}
              {project.tasks.map((task) => {
                const total =
                  Number(task.totalTime) +
                  Number((task as any).runningDuration || 0);
                const estimated = Number(task.estimatedTime || 0);
                const overTime = total - estimated > 0 ? total - estimated : 0;
                const saveTime = estimated - total > 0 ? estimated - total : 0;

                return (
                  <div
                    key={task.id}
                    className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
                  >
                    <div>
                      <div style={{ whiteSpace: "normal", wordBreak: "break-word" }}>
                        <strong>{task.title}</strong>
                      </div>
                      <div className="mt-1">
                        Task Status:
                        <span
                          style={{
                            padding: "2px 4px",
                            borderRadius: "4px",
                            color: "#fff",
                            backgroundColor:
                              statusMap[(task as any).status]?.bgColor || "#6c757d",
                            display: "inline-block",
                            minWidth: "90px",
                            textAlign: "center",
                          }}
                        >
                          {statusMap[(task as any).status]?.label ||
                            (task as any).status}
                        </span>
                      </div>

                      <div className="mt-1">
                        <span>Task Date: {formatDate((task as any).startDate)}</span>
                      </div>
                      <div className="mt-1">
                        <span>
                          Task complition Date:{" "}
                          {formatDate((task as any).endDate)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span>Estimated: {formatDuration(estimated)}</span>
                      </div>

                      {task.isRunning && (
                        <div className="mt-1">
                          <span className="badge bg-success">
                            Running: {formatDuration((task as any).runningDuration || 0)}
                          </span>
                        </div>
                      )}

                      <div className="mt-1">
                        <strong>Total: {formatDuration(total)}</strong>
                      </div>

                      {overTime > 0 && (
                        <div className="mt-1 text-danger">
                          Over Time: {formatDuration(overTime)}
                        </div>
                      )}
                      {saveTime > 0 && (
                        <div className="mt-1 text-success">
                          Saved Time: {formatDuration(saveTime)}
                        </div>
                      )}

                      <button
                        className="btn btn-sm btn-primary mt-2"
                        disabled={
                          !(task as any).endDate ||
                          formatDate(
                            new Date(parseInt((task as any).endDate, 10))
                          ) < new Date().setHours(0, 0, 0, 0) ||
                          task.status === "done"
                        }
                        onClick={() => handleStatusClick(task.id, project.id)}
                      >
                        Change Status to code_review
                      </button>
                    </div>

                    <button
                      className={`btn btn-sm ${
                        task.isRunning ? "btn-danger" : "btn-success"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartStopTimer(task, project.id);
                      }}
                      disabled={(() => {
                        if (!(task as any).endDate) return false;
                        const endDate = new Date(
                          parseInt((task as any).endDate, 10)
                        );
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return endDate < today || task.status === "done";
                      })()}
                    >
                      {task.isRunning ? "Stop" : "Start"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UserDashboard;

// "use client";
// import React, { useState, useEffect, useRef, useCallback } from "react";
// import {
//   changePassword,
//   getUserTasks,
//   startTimer,
//   stopTimer,
//   updateTaskStatus,
// } from "../services/api";
// import { jwtDecode } from "jwt-decode";
// import { useNavigate } from "react-router-dom";
// import { toast } from "react-toastify";
// import { useAuth } from "../context/AuthContext";
// import AutoScreenshot from "./ScreenShot";
// import CreateTaskModal from "../components/CreateTaskModal";

// interface Task {
//   status: string;
//   id: string;
//   title: string;
//   estimatedTime: number;
//   totalTime: number;
//   isRunning: boolean;
//   runningTimer: { id: string; startTime: string; endTime?: string } | null;
// }

// interface Project {
//   id: string;
//   name: string;
//   description?: string;
//   tasks: Task[];
// }
// const statusMap: Record<string, { label: string; bgColor: string }> = {
//   pending: { label: "Pending", bgColor: "#064393ff" },
//   in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
//   code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
//   done: { label: "Done", bgColor: "#2bc22bff" },
// };
// const UserDashboard: React.FC = () => {
//   const { logout } = useAuth();
//   const [projects, setProjects] = useState<Project[]>([]);
//   const [showPasswordForm, setShowPasswordForm] = useState(false);
//   const [oldPassword, setOldPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [newPassword, setNewPassword] = useState("");
//   const [expandedProject, setExpandedProject] = useState<string | null>(null);
//   const intervalsRef = useRef<{ [taskId: string]: NodeJS.Timer }>({});
//   const [username, setUsername] = useState<string>("");
//   const [id, setId] = useState<string>("");
//   const [showTaskModal, setShowTaskModal] = useState(false);
//   const navigate = useNavigate();
//   interface User {
//     id: string;
//     username: string;
//     email: string;
//     role: string;
//   }
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       const parsed = jwtDecode<User>(token);
//       setId(parsed.id || "");
//       setUsername(parsed.username || "");
//     }
//   }, []);
//   useEffect(() => {
//     const handleBeforeUnload = async () => {
//       const runningTasks = projects
//         .flatMap((project) =>
//           project.tasks.map((t) => ({ ...t, projectId: project.id }))
//         )
//         .filter((task) => task.isRunning);

//       for (const task of runningTasks) {
//         try {
//           await stopTimer(task.id);
//           clearInterval(intervalsRef.current[task.id]);
//           delete intervalsRef.current[task.id];
//         } catch (err) {
//           console.error("Error stopping timer before unload:", err);
//         }
//       }
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);

//     return () => {
//       window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
//   }, [projects]);

//   const formatDate = (val: any) => {
//     if (!val) return "";
//     if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
//     const n = Number(val);
//     if (isNaN(n)) return "";
//     return new Date(n).toISOString().split("T")[0];
//   };
//   useEffect(() => {
//     fetchUserTasks();
//   }, [showTaskModal]);
//   const handlePasswordChange = async (e: React.FormEvent) => {
//     e.preventDefault();
//     try {
//       setLoading(true);
//       await changePassword(id, oldPassword, newPassword);
//       toast.success("Password changed successfully");
//       setOldPassword("");
//       setNewPassword("");
//       setShowPasswordForm(false);
//     } catch (err: any) {
//       console.error("Change password error:", err);
//       const errorMessage =
//       err?.networkError?.result?.errors?.[0]?.message ||
//       err?.graphQLErrors?.[0]?.message ||
//       err?.message ||
//       "Failed to change password";

//     toast.error(errorMessage);
//     } finally {
//       setLoading(false);
//     }
//   };
//   const fetchUserTasks = async () => {
//     const data = await getUserTasks();
//     const updated = data.map((project: Project) => ({
//       ...project,
//       tasks: project.tasks.map((t) => ({
//         ...t,
//         runningDuration: t.isRunning ? 0 : undefined,
//       })),
//     }));
//     setProjects(updated);
//   };

//   const toggleExpandProject = (projectId: string) => {
//     setExpandedProject((prev) => (prev === projectId ? null : projectId));
//   };

//   const handleStartStopTimer = async (task: Task, projectId: string) => {
//     if (task.isRunning) {
//       await stopTimer(task.id);
//       clearInterval(intervalsRef.current[task.id]);
//       delete intervalsRef.current[task.id];
//       const refreshedProjects = await getUserTasks();

//       setProjects(
//         refreshedProjects.map((project: Project) =>
//           project.id === projectId
//             ? {
//                 ...project,
//                 tasks: project.tasks.map((t) =>
//                   t.id === task.id
//                     ? {
//                         ...t,
//                         runningDuration: t.isRunning ? 0 : undefined,
//                       }
//                     : t
//                 ),
//               }
//             : project
//         )
//       );
//     } else {
//       await startTimer(task.id);
//       const updatedTask = await updateTaskStatus(task.id, "in_progress");

//       setProjects((prev) =>
//         prev.map((project) =>
//           project.id === projectId
//             ? {
//                 ...project,
//                 tasks: project.tasks.map((t) =>
//                   t.id === task.id
//                     ? {
//                         ...t,
//                         isRunning: true,
//                         runningDuration: 0,
//                         status: updatedTask.status,
//                       }
//                     : t
//                 ),
//               }
//             : project
//         )
//       );

//       // Start live interval
//       intervalsRef.current[task.id] = setInterval(() => {
//         setProjects((prev) =>
//           prev.map((project) =>
//             project.id === projectId
//               ? {
//                   ...project,
//                   tasks: project.tasks.map((t) =>
//                     t.id === task.id
//                       ? {
//                           ...t,
//                           runningDuration:
//                             ((t as any).runningDuration || 0) + 1,
//                         }
//                       : t
//                   ),
//                 }
//               : project
//           )
//         );
//       }, 1000);
//     }
//   };

//   const formatDuration = (seconds: number) => {
//     const h = Math.floor(seconds / 3600);
//     const m = Math.floor((seconds % 3600) / 60);
//     const s = seconds % 60;
//     return `${h.toString().padStart(2, "0")}:${m
//       .toString()
//       .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
//   };

// const handleStatusClick = async (taskId: string, projectId: string) => {

//   const task = projects
//     .find((p) => p.id === projectId)
//     ?.tasks.find((t) => t.id === taskId);

//   if (!task) return;

//   const confirmUpdate = window.confirm(
//     `Are you sure you want to change the status of "${task.title}" to code_review?`
//   );
//   if (!confirmUpdate) return;

//   setProjects((prevProjects) =>
//     prevProjects.map((proj) => {
//       if (proj.id !== projectId) return proj;
//       return {
//         ...proj,
//         tasks: proj.tasks.map((t) =>
//           t.id === taskId ? { ...t, status: "code_review" } : t
//         ),
//       };
//     })
//   );

//   try {
//     await updateTaskStatus(taskId, "code_review");
//     toast.success("Status updated to code_review");
//   } catch (err) {
//     console.error(err);
//     alert("Failed to update status");
//     setProjects((prevProjects) =>
//       prevProjects.map((proj) => {
//         if (proj.id !== projectId) return proj;
//         return {
//           ...proj,
//           tasks: proj.tasks.map((t) =>
//             t.id === taskId ? { ...t, status: task.status } : t
//           ),
//         };
//       })
//     );
//   }
// };
// const projectsRef = useRef(projects);
//   useEffect(() => {
//     projectsRef.current = projects;
//   }, [projects]);

//   const handleScreenShareStopped = useCallback(async () => {
//     console.log("🛑 Screen sharing stopped — cleaning up timers");

//     const runningTasks = projectsRef.current.flatMap((project) =>
//       project.tasks
//         .filter((task) => task.isRunning)
//         .map((task) => ({ ...task, projectId: project.id }))
//     );

//     if (runningTasks.length === 0) {
//       console.log("No running tasks found — nothing to stop");
//       return;
//     }

//     for (const task of runningTasks) {
//       try {
//         await stopTimer(task.id);
//         clearInterval(intervalsRef.current[task.id]);
//         delete intervalsRef.current[task.id];
//         toast.warn(`Timer stopped because screen sharing was ended.`);
//       } catch (err) {
//         console.error(`Failed to stop timer for task ${task.id}`, err);
//       }
//     }

//     const refreshed = await getUserTasks();
//     setProjects(refreshed);
//   }, []);

//   return (
//     <div className="container mt-4">
//       <AutoScreenshot onPermissionDenied={handleScreenShareStopped} />

      
//       {showPasswordForm && (
//         <div
//           className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
//           style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
//         >
//           <div className="bg-white p-4 rounded shadow" style={{ width: "320px" }}>
//             <h5 className="text-center mb-3">Change Password</h5>
//             <form onSubmit={handlePasswordChange}>
//               <div className="mb-3">
//                 <input
//                   type="password"
//                   className="form-control"
//                   placeholder="Old Password"
//                   value={oldPassword}
//                   onChange={(e) => setOldPassword(e.target.value)}
//                   required
//                 />
//               </div>
//               <div className="mb-3">
//                 <input
//                   type="password"
//                   className="form-control"
//                   placeholder="New Password"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   required
//                 />
//               </div>
//               <div className="d-flex justify-content-between">
//                 <button
//                   type="button"
//                   className="btn btn-secondary btn-sm"
//                   onClick={() => setShowPasswordForm(false)}
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="btn btn-primary btn-sm"
//                   disabled={loading}
//                 >
//                   {loading ? "Updating..." : "Update"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h2>Welcome: {username}</h2>
//         <div className="d-flex ms-auto">
//           <button
//             className="btn btn-sm btn-success me-2"
//             onClick={() =>
//               window.open(`/user-timesheet-report/${id}`, "_blank")
//             }
//           >
//             View Timesheet
//           </button>
          
//           <button
//             className="btn btn-sm me-2"
//             style={{background:"violet",color:"white"}}
//             onClick={() =>
//               window.open(`/screenshots/${id}`, "_blank")
//             }
//           >
//             View ScreenShot
//           </button>
          
//         <button className="btn btn-primary btn-sm me-2" onClick={() => setShowTaskModal(true)}>
//         Create Your Own Task
//       </button>
//         <CreateTaskModal show={showTaskModal} onClose={() => setShowTaskModal(false)} />
//           <button
//           className="btn btn-sm btn-warning me-2"
//           onClick={() => setShowPasswordForm(true)}
//         >
//           Change Password
//         </button>
//           <button
//             className="btn btn-danger"
//             onClick={() => {
//               logout();
//               localStorage.removeItem("token");
//               toast.success("Logout successfully...");
//               navigate("/login");
//             }}
//           >
//             Logout
//           </button>
//         </div>
//       </div>

//       <h1 className="text-center">Task Tracker</h1>
//       {projects.map((project) => (
//         <div key={project.id} className="card mb-3" onClick={()=>toggleExpandProject(project.id)}>
//           <div className="card-header d-flex justify-content-between align-items-center">
//             <div>
//               <strong>{project.name}</strong>
//               {project.description && (
//                 <p className="mb-0">{project.description}</p>
//               )}
//             </div>
//             <div className="d-flex align-items-center">
//               <button
//                 className="btn btn-sm btn-info"
//                 onClick={(e) => {
//                   e.stopPropagation();
//                   toggleExpandProject(project.id)}}
//               >
//                 {expandedProject === project.id ? "Collapse" : "View Tasks"}
//               </button>
//             </div>
//           </div>

//           {expandedProject === project.id && (
//             <div className="card-body">
//               {project.tasks.length === 0 && <p>No tasks assigned.</p>}
//               {project.tasks.map((task) => {
//                 const total =
//                   Number(task.totalTime) +
//                   Number((task as any).runningDuration || 0);
//                 const estimated = Number(task.estimatedTime || 0);
//                 const overTime = total - estimated > 0 ? total - estimated : 0;
//                 const saveTime = estimated - total > 0 ? estimated - total : 0;

//                 return (
//                   <div
//                     key={task.id}
//                     className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
//                   >
//                     <div>
//                       <div
//                         style={{
//                           whiteSpace: "normal",
//                           wordBreak: "break-word",
//                           flex: "1 1 auto",
//                           minWidth: 0,
//                         }}
//                       >
//                         <strong>{task.title}</strong>
//                       </div>
//                       <div className="mt-1">
//                         Task Status:
//                         <span
//                           style={{
//                             padding: "2px 4px",
//                             borderRadius: "4px",
//                             color: "#fff",
//                             backgroundColor:
//                               statusMap[(task as any).status]?.bgColor ||
//                               "#6c757d",
//                             display: "inline-block",
//                             minWidth: "90px",
//                             textAlign: "center",
//                           }}
//                         >
//                           {statusMap[(task as any).status]?.label ||
//                             (task as any).status}
//                         </span>
//                       </div>

//                       <div className="mt-1">
//                         <span>
//                           Task Date: {formatDate((task as any).startDate)}
//                         </span>
//                       </div>
//                       <div className="mt-1">
//                         <span>
//                           Task complition Date:{" "}
//                           {formatDate((task as any).endDate)}
//                         </span>
//                       </div>
//                       <div className="mt-1">
//                         <span>Estimated: {formatDuration(estimated)}</span>
//                       </div>

//                       {task.isRunning && (
//                         <div className="mt-1">
//                           <span className="badge bg-success">
//                             Running:{" "}
//                             {formatDuration((task as any).runningDuration || 0)}
//                           </span>
//                         </div>
//                       )}

//                       <div className="mt-1">
//                         <strong>Total: {formatDuration(total)}</strong>
//                       </div>

//                       {overTime > 0 && (
//                         <div className="mt-1">
//                           <span className="text-danger">
//                             Over Time: {formatDuration(overTime)}
//                           </span>
//                         </div>
//                       )}
//                       {saveTime > 0 && (
//                         <div className="mt-1">
//                           <span className="text-success">
//                             Saved Time: {formatDuration(saveTime)}
//                           </span>
//                         </div>
//                       )}
// <button
//   className="btn btn-sm btn-primary mt-2"
//   disabled={
//     !(task as any).endDate ||
//     formatDate(new Date(parseInt((task as any).endDate, 10))) < new Date().setHours(0,0,0,0) ||
//     task.status === "done"
//   }
//   onClick={() => handleStatusClick(task.id, project.id)}
// >
//   Change Status to code_review
// </button>



//                     </div>

//                     <button
//                       className={`btn btn-sm ${
//                         task.isRunning ? "btn-danger" : "btn-success"
//                       }`}
//                       onClick={(e) =>{ 
//                         e.stopPropagation();
//                         handleStartStopTimer(task, project.id)}}
//                       disabled={(() => {
//                         if (!(task as any).endDate) return false;
//                         const endDate = new Date(
//                           parseInt((task as any).endDate, 10)
//                         );
//                         const today = new Date();
//                         today.setHours(0, 0, 0, 0);
//                         return endDate < today || task.status === "done";
//                       })()}
//                     >
//                       {task.isRunning ? "Stop" : "Start"}
//                     </button>
                    
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// export default UserDashboard;
