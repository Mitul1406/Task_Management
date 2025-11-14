"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
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
import { useLocation } from "react-router-dom";
import Select from "react-select";

const TlTask: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(["all"]);
  const [filterStartDate, setFilterStartDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [filterEndDate, setFilterEndDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [showStopPermissionModal, setShowStopPermissionModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10;
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(["all"]);
  const intervalsRef = useRef<{ [key: string]: any }>({});
  const screenshotRef = useRef<AutoScreenshotRef>(null);
  const projectsRef = useRef<any[]>([]);
  const location = useLocation();
  const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "code_review", label: "Code Review" },
  { value: "done", label: "Done" },
];
  const projectOptions = [
  { value: "all", label: "All Projects" },
  ...projects.map((p) => ({ value: p.id, label: p.name })),
]

const selectedProjectOptions = selectedProject.includes("all")
  ? [projectOptions.find((opt) => opt.value === "all")!]
  : projectOptions.filter((opt) => selectedProject.includes(opt.value));


  const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderColor: state.isFocused ? "#0d6efd" : "#ced4da",
    borderRadius: "6px",
    boxShadow: state.isFocused ? "0 0 0 0.2rem rgba(13, 110, 253, 0.25)" : "none",
    minHeight: "35px",
    alignItems: "flex-start",
  }),
  valueContainer: (base: any) => ({
    ...base,
    flexWrap: "wrap",
    alignItems: "flex-start",
    paddingTop: "4px",
    paddingBottom: "4px",
    // maxHeight: "35px", 
    overflowY: "auto", 
    scrollbarWidth: "none", 
    msOverflowStyle: "none", 
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "#e9f2ff",
    margin: "2px",
    borderRadius: "4px",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "#0d6efd",
    whiteSpace: "normal",
    wordBreak: "break-word",
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: "#0d6efd",
    ":hover": {
      backgroundColor: "#0d6efd",
      color: "white",
    },
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
  };

const style = document.createElement("style");
style.innerHTML = `
  .css-1rhbuit-multiValue { max-width: 100%; }
  .css-12jo7m5-value-container::-webkit-scrollbar {
    display: none;
  }
`;
document.head.appendChild(style);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const taskId = params.get("taskId");
    if (taskId) setFocusedTaskId(taskId);
  }, [location.search]);

  const fetchTasks = async () => {
    try {
      const res = await getUserTasks();
      setProjects(res || []);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    return () => Object.values(intervalsRef.current).forEach(clearInterval);
  }, []);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return "-";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(" ");
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

    // Handle numeric timestamp
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

        const anyRunning = projects.some((p) =>
          p.tasks.some((t: any) => t.isRunning && t.id !== task.id)
        );
        if (!anyRunning) setShowStopPermissionModal(true);
        return;
      }

      const IsAnyRunningTasks =projects.some((p) =>
                p.tasks.some((t: any) => t.isRunning && t.id !== task.id)
              );
            if(IsAnyRunningTasks)
            {
              toast.warn("You already have a running task. Please stop it first.");
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
      toast.error("Error while starting/stopping timer.");
    }
  };

  const handleStatusClick = async (taskId: string, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const task = project?.tasks.find((t: any) => t.id === taskId);
    if (!task) return;

    if (!window.confirm(`Change status of "${task.title}" to code_review?`))
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
      toast.error("Failed to update status");
    }
  };

  const statusMap: Record<string, { label: string; bgColor: string }> = {
    pending: { label: "Pending", bgColor: "#064393" },
    in_progress: { label: "In Progress", bgColor: "#4b0867" },
    code_review: { label: "Code Review", bgColor: "#a1dcae" },
    done: { label: "Done", bgColor: "#2bc22b" },
  };

  const allTasks = projects.flatMap((project) =>
    project.tasks.map((task: any) => ({
      ...task,
      projectName: project.name,
      projectId: project.id,
    }))
  );
  
  const filteredTasks = allTasks.filter((task: any) => {
    const projectMatch =
      selectedProject.includes("all") || selectedProject.includes(task.projectId);
    const start:any = normalizeDate(filterStartDate);
    const end:any = normalizeDate(filterEndDate);
    const taskStart = normalizeDate(task.startDate);
    const taskEnd = normalizeDate(task.endDate);
    const statusMatch =
    statusFilter.includes("all") || statusFilter.includes(task.status?.toLowerCase());

    return (
      projectMatch &&statusMatch&&
      taskStart &&
      taskEnd &&
      taskStart <= end &&
      taskEnd >= start
    );
  });

useEffect(() => {
  if (!focusedTaskId || filteredTasks.length === 0) return;
  const index = filteredTasks.findIndex((t) => t.id === focusedTaskId);
  if (index !== -1) {
    const pageNumber = Math.floor(index / tasksPerPage) + 1;
    setCurrentPage(pageNumber);
  }
}, [focusedTaskId, filteredTasks, tasksPerPage]);

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (currentPage - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(
    startIndex,
    startIndex + tasksPerPage
  );

  useEffect(() => {
    if (focusedTaskId) {
      setTimeout(() => {
        const el = document.getElementById(`task-${focusedTaskId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        el?.classList.add("table-warning");
        setTimeout(() => el?.classList.remove("table-warning"), 2500);
      }, 600);
    }
  }, [focusedTaskId, paginatedTasks]);

  if (loading) return <p>Loading tasks...</p>;

  return (
    <div className="container mt-4">
      <NotificationPermissionBanner />
      <AutoScreenshot
        ref={screenshotRef}
        onPermissionDenied={() => handleScreenShareStopped()}
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Your Tasks</h3>
        <button
          className="btn btn-primary"
          onClick={() => setShowTaskModal(true)}
        >
          Create Your Own Task
        </button>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-3 mb-3">
  {/* First row: Project + Status */}
  <div className="d-flex flex-wrap gap-3 w-100 mb-3">
    <div style={{ minWidth: "200px",flex: "1" }}>
      <label className="form-label fw-bold">Project</label>
      <Select
        isMulti
        options={projectOptions}
        value={selectedProjectOptions}
        onChange={(selected: any) => {
          const values = selected ? selected.map((s: any) => s.value) : [];
          if (values.includes("all")) setSelectedProject(["all"]);
          else if (values.length === 0) setSelectedProject([]);
          else setSelectedProject(values);
        }}
        placeholder="Select Projects..."
        styles={selectStyles}
      />
    </div>

    <div style={{ minWidth: "200px",flex: "1" }}>
      <label className="form-label fw-bold">Status</label>
      <Select
        isMulti
        options={statusOptions}
        value={statusOptions.filter((opt) => statusFilter.includes(opt.value))}
        onChange={(selected: any) => {
          const values = selected ? selected.map((s: any) => s.value) : [];
          setStatusFilter(values.includes("all") ? ["all"] : values);
        }}
        placeholder="Select Status..."
        styles={selectStyles}
      />
    </div>
  </div>

  {/* Second row: Start Date + End Date */}
  <div className="d-flex flex-wrap gap-3 w-100">
    <div style={{ minWidth: "200px" }}>
      <label className="form-label fw-bold">Start Date</label>
      <input
        type="date"
        className="form-control"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
      />
    </div>

    <div style={{ minWidth: "200px"}}>
      <label className="form-label fw-bold">End Date</label>
      <input
        type="date"
        className="form-control"
        value={filterEndDate}
        onChange={(e) => setFilterEndDate(e.target.value)}
      />
    </div>
  </div>
</div>


      <div className="table-responsive card p-3 border-0 bg-light">
        <table className="table table-hover table-bordered align-middle text-left" style={{border:"1px solid #000"}} >
          <thead style={{ backgroundColor: "#1b263b", color: "#fff" }}>
            <tr>
              <th>Project</th>
              <th style={{minWidth:"300px"}}>Task</th>
              <th>Estimated</th>
              <th>Consumed</th>
              <th style={{minWidth:"100px"}}>Start</th>
              <th style={{minWidth:"100px"}}>End</th>
              <th>Status</th>
              <th style={{minWidth:"235px"}}>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map((task: any) => (
                <tr
                  key={task.id}
                  id={`task-${task.id}`}
                  onClick={()=>setFocusedTaskId(null)}
                  className={task.id === focusedTaskId ? "table-warning" : ""}
                >
                  <td>{task.projectName}</td>
                  <td className="text-wrap text-break">{task.title}</td>
                  <td>{formatDuration(task.estimatedTime)}</td>
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
                      >
                        {task.isRunning ? "Stop" : "Start"}
                      </button>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() =>
                          handleStatusClick(task.id, task.projectId)
                        }
                      >
                        Change to Code Review
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center text-muted py-3">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            totalPages={totalPages}
            pageSize={tasksPerPage}
            totalResults={filteredTasks.length}
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

      <CreateTaskModal
        show={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        fetchUserTask={fetchTasks}
      />
    </div>
  );
};

export default TlTask;


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

// const TlTask: React.FC = () => {
//   const [projects, setProjects] = useState<any[]>([]);
//   const [loading, setLoading] = useState(true);

//   const [selectedProject, setSelectedProject] = useState<string>("all");
//   const [showStopPermissionModal, setShowStopPermissionModal] = useState(false);
//   const [showTaskModal, setShowTaskModal] = useState(false);
//   const intervalsRef = useRef<{ [key: string]: any }>({});
//   const screenshotRef = useRef<AutoScreenshotRef>(null);
//   const projectsRef = useRef<any[]>([]);
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
//                         totalTime: (t.totalTime || 0) + (t.runningDuration || 0),
//                         runningDuration: 0,
//                       }
//                     : t
//                 ),
//               }
//             : p
//         )
//       );

//       const anyRunning = projects.some((p) =>
//         p.tasks.some((t: any) => t.isRunning && t.id !== task.id)
//       );

//       if (!anyRunning) {
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
//     }

//     const res = await startTimer(task.id);
//     if (!res.success) {
//       toast.error(res.message || "Failed to start timer");
//       return;
//     }

//     const updatedTask = await updateTaskStatus(task.id, "in_progress");

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
//    };

//   const normalizeDate = (val: any) => {
//     if (!val) return null;

//     if (!isNaN(Number(val))) {
//       const d = new Date(Number(val));
//       d.setHours(0, 0, 0, 0);
//       return d;
//     }

//     const d = new Date(val);
//     if (isNaN(d.getTime())) return null; 
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
//         <button className="btn btn-primary mt-2" onClick={() => setShowTaskModal(true)}>
//         Create Your Own Task
//       </button>
//         <CreateTaskModal show={showTaskModal} onClose={() => setShowTaskModal(false)} fetchUserTask={fetchTasks}/>

//         </div>

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

// export default TlTask;
