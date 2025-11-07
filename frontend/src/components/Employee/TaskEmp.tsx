// "use client";

// import React, { useCallback, useEffect, useRef, useState } from "react";
// import { toast } from "react-toastify";
// import { jwtDecode } from "jwt-decode";
// import {
//   getUserTasks,
//   startTimer,
//   stopTimer,
//   updateTaskStatus,
// } from "../../services/api";
// import AutoScreenshot, { AutoScreenshotRef } from "../../pages/ScreenShot";
// import NotificationPermissionBanner, { notifyUser } from "../notifyUser";
// import CreateTaskModal from "../CreateTaskModal";
// import StopPermissionModal from "../StopPermissionModel";

// const TaskEmp: React.FC = () => {
//   const [projects, setProjects] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   // 🔽 Added filter state for selected project
//   const [selectedProject, setSelectedProject] = useState<string>("all");

//   const intervalsRef = useRef<{ [key: string]: any }>({});
//   const screenshotRef = useRef<AutoScreenshotRef>(null);
//   const projectsRef = useRef<any[]>([]);
//   const [showTaskModal, setShowTaskModal] = useState(false);  
//   const [showStopPermissionModal, setShowStopPermissionModal] = useState(false);
//   const [filterStartDate, setFilterStartDate] = useState(
//     () => new Date().toISOString().split("T")[0]
//   );
//   const [filterEndDate, setFilterEndDate] = useState(
//     () => new Date().toISOString().split("T")[0]
//   );

//   useEffect(() => {
//     projectsRef.current = projects;
//   }, [projects]);

//   const handleScreenShareStopped = useCallback(async () => {
//     const runningTasks =
//       projectsRef.current?.flatMap((project: any) =>
//         project.tasks
//           .filter((task: any) => task.isRunning)
//           .map((task: any) => ({ ...task, projectId: project.id }))
//       ) || [];

//     if (runningTasks.length === 0) return;

//     for (const task of runningTasks) {
//       try {
//         await stopTimer(task.id);
//         clearInterval(intervalsRef.current[task.id]);
//         delete intervalsRef.current[task.id];

//         notifyUser(
//           "Timer Stopped",
//           "Your timer stopped because screen sharing was ended. Visit the website now.",
//           `/tlTask`
//         );

//         setProjects((prev) =>
//           prev.map((project: any) =>
//             project.id === task.projectId
//               ? {
//                   ...project,
//                   tasks: project.tasks.map((t: any) =>
//                     t.id === task.id
//                       ? {
//                           ...t,
//                           isRunning: false,
//                           totalTime:
//                             (t.totalTime || 0) + (t.runningDuration || 0),
//                           runningDuration: 0,
//                         }
//                       : t
//                   ),
//                 }
//               : project
//           )
//         );
//       } catch (err) {
//         console.error(`❌ Failed to stop timer for task ${task.id}`, err);
//       }
//     }

//     setTimeout(async () => {
//       const refreshed = await getUserTasks();
//       setProjects(refreshed);
//     }, 1000);
//   }, []);

//   const fetchTasks = async () => {
//     try {
//       const token: any = localStorage.getItem("token");
//       const decode: any = jwtDecode(token);
//       const res = await getUserTasks();
//       setProjects(res || []);
//     } catch (error) {
//       console.error(error);
//       toast.error("Failed to fetch tasks");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchTasks();
//     return () => {
//       Object.values(intervalsRef.current).forEach(clearInterval);
//     };
//   }, []);

//   const formatDuration = (seconds: number) => {
//     if (!seconds || seconds <= 0) return "-";
//     const h = Math.floor(seconds / 3600);
//     const m = Math.floor((seconds % 3600) / 60);
//     const s = seconds % 60;
//     const parts: string[] = [];
//     if (h > 0) parts.push(`${h.toString().padStart(2, "0")}h`);
//     if (m > 0) parts.push(`${m.toString().padStart(2, "0")}m`);
//     if (s > 0) parts.push(`${s.toString().padStart(2, "0")}s`);
//     return parts.length > 0 ? parts.join(" ") : "-";
//   };

//   const formatDate = (val: any) => {
//     if (!val) return "";
//     if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
//     const n = Number(val);
//     if (isNaN(n)) return "";
//     return new Date(n).toISOString().split("T")[0];
//   };

//   const handleStartStopTimer = async (task: any, projectId: string) => {
//   try {
//     if (task.isRunning) {
//       // Stop timer
//       await stopTimer(task.id);
//       clearInterval(intervalsRef.current[task.id]);
//       delete intervalsRef.current[task.id];

//       setProjects((prev) =>
//         prev.map((p) =>
//           p.id === projectId
//             ? {
//                 ...p,
//                 tasks: p.tasks.map((t: any) =>
//                   t.id === task.id
//                     ? {
//                         ...t,
//                         isRunning: false,
//                         totalTime:
//                           (t.totalTime || 0) + (t.runningDuration || 0),
//                         runningDuration: 0,
//                       }
//                     : t
//                 ),
//               }
//             : p
//         )
//       );

//       const allStopped = projects.some((p) =>
//         p.tasks.some((t: any) => t.isRunning && t.id !== task.id)
//       );

//       if (!allStopped) {
//         setShowStopPermissionModal(true);
//       }

//       return;
//     }

//     let hasPermission = screenshotRef.current?.hasPermission;

//     if (!hasPermission) {
//       const granted = await screenshotRef.current?.requestScreenShare?.();
//       if (!granted) {
//         toast.error("You must share your ENTIRE SCREEN to start a task.");
//         return;
//       }
//       hasPermission = true;

//         };
    

//     // Start timer in backend
//     const res = await startTimer(task.id);
//     if (!res.success) {
//       toast.error(res.message || "Failed to start timer");
//       return;
//     }

//     const updatedTask = await updateTaskStatus(task.id, "in_progress");

//     // Update local state
//     setProjects((prev) =>
//       prev.map((p) =>
//         p.id === projectId
//           ? {
//               ...p,
//               tasks: p.tasks.map((t: any) =>
//                 t.id === task.id
//                   ? {
//                       ...t,
//                       isRunning: true,
//                       runningDuration: 0,
//                       status: updatedTask.status,
//                     }
//                   : t
//               ),
//             }
//           : p
//       )
//     );

//     // Timer interval
//     intervalsRef.current[task.id] = setInterval(() => {
//       setProjects((prev) =>
//         prev.map((p) =>
//           p.id === projectId
//             ? {
//                 ...p,
//                 tasks: p.tasks.map((t: any) =>
//                   t.id === task.id
//                     ? { ...t, runningDuration: (t.runningDuration || 0) + 1 }
//                     : t
//                 ),
//               }
//             : p
//         )
//       );
//     }, 1000);
//   } catch (error) {
//     console.error("Error in handleStartStopTimer:", error);
//     toast.error("Something went wrong while starting/stopping timer.");
//   }
// };

//   const normalizeDate = (val: any) => {
//     if (!val) return null;

//     // Handle numeric timestamp
//     if (!isNaN(Number(val))) {
//       const d = new Date(Number(val));
//       d.setHours(0, 0, 0, 0);
//       return d;
//     }

//     // Handle ISO string (e.g., "2025-11-05")
//     const d = new Date(val);
//     if (isNaN(d.getTime())) return null; // invalid date fallback
//     d.setHours(0, 0, 0, 0);
//     return d;
//   };

//   const handleStatusClick = async (taskId: string, projectId: string) => {
//     const project = projects.find((p) => p.id === projectId);
//     const task = project?.tasks.find((t: any) => t.id === taskId);
//     if (!task) return;

//     if (
//       !window.confirm(
//         `Are you sure you want to change the status of "${task.title}" to code_review?`
//       )
//     )
//       return;

//     setProjects((prev) =>
//       prev.map((p) =>
//         p.id === projectId
//           ? {
//               ...p,
//               tasks: p.tasks.map((t: any) =>
//                 t.id === taskId ? { ...t, status: "code_review" } : t
//               ),
//             }
//           : p
//       )
//     );

//     try {
//       await updateTaskStatus(taskId, "code_review");
//       toast.success("Status updated to code_review");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to update status, reverting...");
//       setProjects((prev) =>
//         prev.map((p) =>
//           p.id === projectId
//             ? {
//                 ...p,
//                 tasks: p.tasks.map((t: any) =>
//                   t.id === taskId ? { ...t, status: task.status } : t
//                 ),
//               }
//             : p
//         )
//       );
//     }
//   };

//   const statusMap: Record<string, { label: string; bgColor: string }> = {
//     pending: { label: "Pending", bgColor: "#064393ff" },
//     in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
//     code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
//     done: { label: "Done", bgColor: "#2bc22bff" },
//   };

//   // 🔽 Filter logic based on selected project
//   const filteredProjects =
//     selectedProject === "all"
//       ? projects
//       : projects.filter((p) => p.id === selectedProject);

//   if (loading) return <p>Loading tasks...</p>;

//   return (
//     <div className="container mt-4">
//       <NotificationPermissionBanner />
//       <AutoScreenshot
//         ref={screenshotRef}
//         onPermissionDenied={handleScreenShareStopped}
//       />

//       {/* 🔽 Project Select Filter */}
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h3>Your Tasks:</h3>
//         <div>
//         <button className="btn btn-primary mt-2" onClick={() => setShowTaskModal(true)}>
//         Create Your Own Task
//       </button>
//         <CreateTaskModal show={showTaskModal} onClose={() => setShowTaskModal(false)} fetchUserTask={fetchTasks}/></div>
//       </div>

//       {filteredProjects.length === 0 ? (
//         <p>No tasks found for this project.</p>
//       ) : (
//         <div className="row">
//   {/* === Filters Section === */}
//   <div className="d-flex align-items-end gap-3 flex-wrap mb-3">
//     <div>
//       <label className="form-label fw-bold">Select Project:</label>
//       <select
//         className="form-select"
//         style={{ width: "200px" }}
//         value={selectedProject}
//         onChange={(e) => setSelectedProject(e.target.value)}
//       >
//         <option value="all">All Projects</option>
//         {projects.map((project) => (
//           <option key={project.id} value={project.id}>
//             {project.name}
//           </option>
//         ))}
//       </select>
//     </div>

//     <div>
//       <label className="form-label fw-bold">Start Date:</label>
//       <input
//         type="date"
//         className="form-control"
//         style={{ width: "180px" }}
//         value={filterStartDate}
//         onChange={(e) => setFilterStartDate(e.target.value)}
//       />
//     </div>

//     <div>
//       <label className="form-label fw-bold">End Date:</label>
//       <input
//         type="date"
//         className="form-control"
//         style={{ width: "180px" }}
//         value={filterEndDate}
//         min={filterStartDate}
//         onChange={(e) => setFilterEndDate(e.target.value)}
//       />
//     </div>
//   </div>

//   {filteredProjects.length > 0 ? (
//     filteredProjects.map((project) => {
//       const filteredTasks = project.tasks?.filter((task: any) => {
//         const taskStart = normalizeDate(task.startDate);
//         const taskEnd = normalizeDate(task.endDate);
//         const selectedStart:any = normalizeDate(filterStartDate);
//         const selectedEnd:any = normalizeDate(filterEndDate);

//         if (!taskStart || !taskEnd) return false;
//         return taskStart <= selectedEnd && taskEnd >= selectedStart;
//       });

//       return (
//         <div key={project.id} className="col-12 mb-4">
//           {/* === Project Header === */}
//           <div
//             className="px-3 py-2 text-white rounded-top"
//             style={{ background: "#a4c4e5ff" }}
//           >
//             <h5 className="mb-0">{project.name}</h5>
//           </div>

//           {/* === Task Section === */}
//           <div className="p-3 rounded-bottom" style={{ background: "#e6e9ecff" }}>
//             {filteredTasks && filteredTasks.length > 0 ? (
//               <div className="d-flex flex-wrap gap-3">
//                 {filteredTasks.map((task: any) => (
//                   <div
//                     key={task.id}
//                     className="p-3 rounded border shadow-sm"
//                     style={{
//                       background: "#e9efff",
//                       minWidth: "280px",
//                     //   flex: "1 1 280px",
//                     }}
//                   >
//                     <div className="d-flex justify-content-between align-items-center">
//                       <h6 className="mb-0">{task.title}</h6>
//                       <span
//                         className="badge"
//                         style={{
//                           background:
//                             statusMap[task.status]?.bgColor || "#6c757d",
//                           color: "#fff",
//                         }}
//                       >
//                         {statusMap[task.status]?.label || task.status}
//                       </span>
//                     </div>

//                     <div className="mt-2 small text-muted">
//                       <div>
//                         Estimated:{" "}
//                         {formatDuration(task.estimatedTime || 0)}
//                       </div>
//                       <div>
//                         Consumed:{" "}
//                         {formatDuration(
//                           (task.totalTime || 0) +
//                             (task.runningDuration || 0)
//                         )}
//                       </div>
//                       <div>Start: {formatDate(task.startDate)}</div>
//                       <div>End: {formatDate(task.endDate)}</div>
//                     </div>

//                     <div className="mt-2 d-flex gap-2">
//                       <button
//                         className={`btn btn-sm ${
//                           task.isRunning ? "btn-danger" : "btn-success"
//                         }`}
//                         onClick={() => handleStartStopTimer(task, project.id)}
//                         disabled={task.status === "done"}
//                       >
//                         {task.isRunning ? "Stop Timer" : "Start Timer"}
//                       </button>
//                       <button
//                         className="btn btn-sm btn-primary"
//                         onClick={() => handleStatusClick(task.id, project.id)}
//                         disabled={task.status === "done"}
//                       >
//                         Change to Code Review
//                       </button>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <p className="text-muted mb-0">
//                 No tasks found in the selected date range.
//               </p>
//             )}
//           </div>
//         </div>
//       );
//     })
//   ) : (
//     <p className="text-center text-muted">No projects available.</p>
//   )}
// </div>

//       )}

//       <StopPermissionModal
//   show={showStopPermissionModal}
//   onConfirm={() => {
//     screenshotRef.current?.stopScreenShare();
//     setShowStopPermissionModal(false);
//   }}
//   onCancel={() => setShowStopPermissionModal(false)}
// />
//     </div>
//   );
// };

// export default TaskEmp;


"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { useLocation, useParams } from "react-router-dom";
import {
  getUserTasks,
  startTimer,
  stopTimer,
  updateTaskStatus,
} from "../../services/api";
import AutoScreenshot, { AutoScreenshotRef } from "../../pages/ScreenShot";
import NotificationPermissionBanner, { notifyUser } from "../notifyUser";
import CreateTaskModal from "../CreateTaskModal";
import StopPermissionModal from "../StopPermissionModel";
import Pagination from "../Pagination"; 

const ITEMS_PER_PAGE = 10;

const TaskEmp: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showStopPermissionModal, setShowStopPermissionModal] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [currentPage, setCurrentPage] = useState(1);

  const intervalsRef = useRef<{ [key: string]: any }>({});
  const screenshotRef = useRef<AutoScreenshotRef>(null);
  const projectsRef = useRef<any[]>([]);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const taskId = queryParams.get("taskId");
  // const { taskId } = useParams();
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(taskId || null);
  useEffect(() => {
  if (taskId) {
    setHighlightTaskId(taskId);
  }
  // alert(taskId)
}, [taskId]);
  
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  const handleScreenShareStopped = useCallback(async () => {
    const runningTasks =
      projectsRef.current?.flatMap((project: any) =>
        project.tasks
          .filter((task: any) => task.isRunning)
          .map((task: any) => ({ ...task, projectId: project.id }))
      ) || [];

    if (runningTasks.length === 0) return;

    for (const task of runningTasks) {
      try {
        await stopTimer(task.id);
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];

        notifyUser(
          "Timer Stopped",
          "Your timer stopped because screen sharing was ended. Visit the website now.",
          `/tlTask`
        );

        setProjects((prev) =>
          prev.map((project: any) =>
            project.id === task.projectId
              ? {
                  ...project,
                  tasks: project.tasks.map((t: any) =>
                    t.id === task.id
                      ? {
                          ...t,
                          isRunning: false,
                          totalTime:
                            (t.totalTime || 0) + (t.runningDuration || 0),
                          runningDuration: 0,
                        }
                      : t
                  ),
                }
              : project
          )
        );
      } catch (err) {
        console.error(`❌ Failed to stop timer for task ${task.id}`, err);
      }
    }

    setTimeout(async () => {
      const refreshed = await getUserTasks();
      setProjects(refreshed);
    }, 1000);
  }, []);

  const fetchTasks = async () => {
    try {
      const token: any = localStorage.getItem("token");
      jwtDecode(token);
      const res = await getUserTasks();
      setProjects(res || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h.toString().padStart(2, "0")}h`);
    if (m > 0) parts.push(`${m.toString().padStart(2, "0")}m`);
    if (s > 0) parts.push(`${s.toString().padStart(2, "0")}s`);
    return parts.length > 0 ? parts.join(" ") : "-";
  };

  const formatDate = (val: any) => {
    if (!val) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const n = Number(val);
    if (isNaN(n)) return "";
    return new Date(n).toISOString().split("T")[0];
  };

  const normalizeDate = (val: any) => {
    if (!val) return null;

    if (!isNaN(Number(val))) {
      const d = new Date(Number(val));
      d.setHours(0, 0, 0, 0);
      return d;
    }

    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleStartStopTimer = async (task: any, projectId: string) => {
    try {
      if (task.isRunning) {
        await stopTimer(task.id);
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];

        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t: any) =>
                    t.id === task.id
                      ? {
                          ...t,
                          isRunning: false,
                          totalTime:
                            (t.totalTime || 0) + (t.runningDuration || 0),
                          runningDuration: 0,
                        }
                      : t
                  ),
                }
              : p
          )
        );
        const anyRunningTasks = Object.values(intervalsRef.current).length > 0;

        if (!anyRunningTasks) {
        setShowStopPermissionModal(true);
      }
        return;
      }

      let hasPermission = screenshotRef.current?.hasPermission;
      if (!hasPermission) {
        const granted = await screenshotRef.current?.requestScreenShare?.();
        if (!granted) {
          toast.error("You must share your ENTIRE SCREEN to start a task.");
          return;
        }
        hasPermission = true;
      }

      const res = await startTimer(task.id);
      if (!res.success) {
        toast.error(res.message || "Failed to start timer");
        return;
      }

      const updatedTask = await updateTaskStatus(task.id, "in_progress");

      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                tasks: p.tasks.map((t: any) =>
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
            : p
        )
      );

      intervalsRef.current[task.id] = setInterval(() => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  tasks: p.tasks.map((t: any) =>
                    t.id === task.id
                      ? { ...t, runningDuration: (t.runningDuration || 0) + 1 }
                      : t
                  ),
                }
              : p
          )
        );
      }, 1000);
    } catch (error) {
      console.error("Error in handleStartStopTimer:", error);
      toast.error("Something went wrong while starting/stopping timer.");
    }
  };

  const handleStatusClick = async (taskId: string, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const task = project?.tasks.find((t: any) => t.id === taskId);
    if (!task) return;

    if (
      !window.confirm(
        `Are you sure you want to change the status of "${task.title}" to code_review?`
      )
    )
      return;

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t: any) =>
                t.id === taskId ? { ...t, status: "code_review" } : t
              ),
            }
          : p
      )
    );

    try {
      await updateTaskStatus(taskId, "code_review");
      toast.success("Status updated to code_review");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status, reverting...");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                tasks: p.tasks.map((t: any) =>
                  t.id === taskId ? { ...t, status: task.status } : t
                ),
              }
            : p
        )
      );
    }
  };

  const statusMap: Record<string, { label: string; bgColor: string }> = {
    pending: { label: "Pending", bgColor: "#064393ff" },
    in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
    code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
    done: { label: "Done", bgColor: "#2bc22bff" },
  };

  // 🔹 Flatten all tasks into one list with project info
  const allTasks = projects.flatMap((project) =>
    project.tasks.map((task: any) => ({
      ...task,
      projectId: project.id,
      projectName: project.name,
    }))
  );

const filteredTasks = allTasks.filter((task: any) => {
  const taskStart = normalizeDate(task.startDate);
  const taskEnd = normalizeDate(task.endDate);
  const selectedStart: any = normalizeDate(filterStartDate);
  const selectedEnd: any = normalizeDate(filterEndDate);

  const projectNameMatch = projectFilter
    ? task.projectName?.toLowerCase().includes(projectFilter.toLowerCase())
    : true;

  const statusMatch =
    statusFilter === "all"
      ? true
      : task.status?.toLowerCase() === statusFilter.toLowerCase();

  const dateMatch =
    taskStart && taskEnd
      ? taskStart <= selectedEnd && taskEnd >= selectedStart
      : false;

  return projectNameMatch && statusMatch && dateMatch;
});

useEffect(() => {
  if (!highlightTaskId || filteredTasks.length === 0) return;
   
  const index = filteredTasks.findIndex((t) => t.id === highlightTaskId);
  if (index !== -1) {
    const pageNumber = Math.floor(index / ITEMS_PER_PAGE) + 1;
    setCurrentPage(pageNumber);
  }
}, [highlightTaskId, filteredTasks]);


  const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div className="container mt-4">
      <NotificationPermissionBanner />
      <AutoScreenshot
        ref={screenshotRef}
        onPermissionDenied={handleScreenShareStopped}
      />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Your Tasks</h3>
        <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
          Create Your Own Task
        </button>
        <CreateTaskModal
          show={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          fetchUserTask={fetchTasks}
        />
      </div>

      {/* Date Filters */}
      <div className="d-flex align-items-end gap-3 flex-wrap mb-3">
        <div>
  <label className="form-label fw-bold">Project Name:</label>
  <select
  value={projectFilter}
  onChange={(e) => setProjectFilter(e.target.value)}
  className="form-select"
  style={{ maxWidth: "200px" }}
>
  <option value="">All Projects</option>
  {Array.from(new Set(allTasks.map((t: any) => t.projectName))).map((name) => (
    <option key={name} value={name}>
      {name}
    </option>
  ))}
</select>

        </div>
 
 <div>
  <label className="form-label fw-bold">Status:</label>
 <select
  className="form-select"
  style={{ width: "180px" }}
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
>
  <option value="all">All Statuses</option>
  <option value="pending">Pending</option>
  <option value="in_progress">In Progress</option>
  <option value="code_review">Code Review</option>
  <option value="done">Done</option>
</select>

        </div>
        <div>
          <label className="form-label fw-bold">Start Date:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: "180px" }}
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label fw-bold">End Date:</label>
          <input
            type="date"
            className="form-control"
            style={{ width: "180px" }}
            value={filterEndDate}
            min={filterStartDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* 🔹 Single Table for All Tasks */}
      <div className="table-responsive card p-3">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Project</th>
              <th style={{minWidth:"300px"}}>Task</th>
              <th>Estimated</th>
              <th>Consumed</th>
              <th style={{minWidth:"100px"}}>Start</th>
              <th style={{minWidth:"100px"}}>End</th>
              <th>Status</th>
              <th style={{minWidth:"240px"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map((task: any) => (
                <tr
                  key={task.id}
                  className={highlightTaskId === task.id ? "table-warning fw-bold" : ""}
                >
                  <td>{task.projectName}</td>
                  <td className="text-wrap text-break">{task.title}</td>
                  
                  <td>{formatDuration(task.estimatedTime || 0)}</td>
                  <td>
                    {formatDuration(
                      (task.totalTime || 0) + (task.runningDuration || 0)
                    )}
                  </td>
                  <td>{formatDate(task.startDate)}</td>
                  <td>{formatDate(task.endDate)}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background:
                          statusMap[task.status]?.bgColor || "#6c757d",
                        color: "#fff",
                      }}
                    >
                      {statusMap[task.status]?.label || task.status}
                    </span>
                  </td>
                  <td>
                    <div className="d-flex gap-2">
                      <button
                        className={`btn btn-sm ${
                          task.isRunning ? "btn-danger" : "btn-success"
                        }`}
                        onClick={() =>
                          handleStartStopTimer(task, task.projectId)
                        }
                        disabled={task.status === "done"}
                      >
                        {task.isRunning ? "Stop" : "Start"}
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                          handleStatusClick(task.id, task.projectId)
                        }
                        disabled={task.status === "done"}
                      >
                        Change to Code Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  No tasks found in the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
      </div>

      {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
          />
      )}

      <StopPermissionModal
        show={showStopPermissionModal}
        onConfirm={() => {
          screenshotRef.current?.stopScreenShare();
          setShowStopPermissionModal(false);
        }}
        onCancel={() => setShowStopPermissionModal(false)}
      />
    </div>
  );
};

export default TaskEmp;
