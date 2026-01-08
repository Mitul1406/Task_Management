"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getUserTasks,
  sendMailToTeamLeads,
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
import { jwtDecode } from "jwt-decode";
import { FaShare } from "react-icons/fa";
import Swal from "sweetalert2";
import { useScreenShare } from "../../context/ScreenRecordContext";

const TlTask: React.FC = () => {
  const esRef = useRef<EventSource | null>(null);
  const { globalStream } = useScreenShare();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loading1, setLoading1] = useState(false);
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
    color: "#000",
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


//  useEffect(() => {
//   const token: any = localStorage.getItem("token");
//   const data: any = jwtDecode(token);
//   const userId = data.id;

//   let es: EventSource;

//   const connectSSE = () => {
//     es = new EventSource(`${process.env.REACT_APP_BACKEND_URL}/events/${userId}`);

//     es.onmessage = (event) => {
//       const data = JSON.parse(event.data);
//       console.log("SSE event:", data);

//       if (data.stopConfirmed) {
//         screenshotRef.current?.stopScreenShare();

//         Object.keys(intervalsRef.current).forEach((taskId) => {
//           clearInterval(intervalsRef.current[taskId]);
//           delete intervalsRef.current[taskId];
//         });

//         setProjects((prev) =>
//           prev.map((proj) => ({
//             ...proj,
//             tasks: proj.tasks.map((t: any) =>
//               t.isRunning
//                 ? {
//                     ...t,
//                     isRunning: false,
//                     totalTime: (t.totalTime || 0) + (t.runningDuration || 0),
//                     runningDuration: 0,
//                   }
//                 : t
//             ),
//           }))
//         );

//         return;
//       }

//       if (data.id && data.projectId) {
//         const updatedTask = data;

//         setProjects((prev) =>
//           prev.map((proj) =>
//             proj.id === updatedTask.projectId
//               ? {
//                   ...proj,
//                   tasks: proj.tasks.map((task: any) => {
//                     if (task.id === updatedTask.id) {
//                       if (!updatedTask.isRunning && intervalsRef.current[task.id]) {
//                         clearInterval(intervalsRef.current[task.id]);
//                         delete intervalsRef.current[task.id];
//                       }

//                       if (updatedTask.isRunning && !intervalsRef.current[task.id]) {
//                         intervalsRef.current[task.id] = setInterval(() => {
//                           setProjects((prevProjects) =>
//                             prevProjects.map((projItem) =>
//                               projItem.id === updatedTask.projectId
//                                 ? {
//                                     ...projItem,
//                                     tasks: projItem.tasks.map((taskItem: any) =>
//                                       taskItem.id === updatedTask.id
//                                         ? {
//                                             ...taskItem,
//                                             runningDuration:
//                                               (taskItem.runningDuration || 0) + 1,
//                                           }
//                                         : taskItem
//                                     ),
//                                   }
//                                 : projItem
//                             )
//                           );
//                         }, 1000);
//                       }

//                       return { ...task, ...updatedTask };
//                     }
//                     return task;
//                   }),
//                 }
//               : proj
//           )
//         );
//       }
//     };

//     es.onerror = () => {
//       es.close();
//       setTimeout(connectSSE, 2000);
//     };
//   };

//   connectSSE();

//   return () => es.close();
// }, []);

  
    useEffect(() => {
    const token: any = localStorage.getItem("token");
    const data: any = jwtDecode(token);
    const userId = data.id;
  
    const connectSSE = () => {
      if (esRef.current) {
        esRef.current.close(); // close old before creating new
      }
  
      const es = new EventSource(
        `${process.env.REACT_APP_BACKEND_URL}/events/${userId}`
      );
  
      esRef.current = es;
  
      es.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("SSE event------->:", data);
  
        // ---------- your existing logic ----------
        if (data.stopConfirmed) {
          screenshotRef.current?.stopScreenShare();
  
          Object.keys(intervalsRef.current).forEach((taskId) => {
            clearInterval(intervalsRef.current[taskId]);
            delete intervalsRef.current[taskId];
          });
  
          setProjects((prev) =>
            prev.map((proj) => ({
              ...proj,
              tasks: proj.tasks.map((t: any) =>
                t.isRunning
                  ? {
                      ...t,
                      isRunning: false,
                      totalTime: (t.totalTime || 0) + (t.runningDuration || 0),
                      runningDuration: 0,
                    }
                  : t
              ),
            }))
          );
          return;
        }
  
        if (data.id && data.projectId) {
          const updatedTask = data;
  
          setProjects((prev) =>
            prev.map((p) =>
              p.id === updatedTask.projectId
                ? {
                    ...p,
                    tasks: p.tasks.map((t: any) => {
                      // START interval
                      if (t.id === updatedTask.id) {
                        if (updatedTask.isRunning) {
  // Clear old interval first
  if (intervalsRef.current[t.id]) {
    clearInterval(intervalsRef.current[t.id]);
    delete intervalsRef.current[t.id];
  }

  intervalsRef.current[t.id] = setInterval(() => {
    setProjects((prevProjects) =>
      prevProjects.map((proj) =>
        proj.id === updatedTask.projectId
          ? {
              ...proj,
              tasks: proj.tasks.map((taskItem:any) =>
                taskItem.id === updatedTask.id
                  ? { ...taskItem, runningDuration: (taskItem.runningDuration || 0) + 1 }
                  : taskItem
              ),
            }
          : proj
      )
    );
  }, 1000);
} else if (intervalsRef.current[t.id]) {
  clearInterval(intervalsRef.current[t.id]);
  delete intervalsRef.current[t.id];
}

  
                        return { ...t, ...updatedTask };
                      }
  
                      return t;
                    }),
                  }
                : p
            )
          );
        }
      };
  
      es.onerror = () => {
        console.log("SSE disconnected, reconnecting...");
        es.close();
        setTimeout(connectSSE, 2000);
      };
    };
  
    connectSSE();
  
    return () => {
      console.log("Closing SSE on unmount");
      if (esRef.current) esRef.current.close();
    };
  }, []);
  
    useEffect(() => {
    const initialize = async () => {    
      try {
        const userTasks: any = await fetchTasks();
        const token: any = localStorage.getItem("token");
        const data: any = jwtDecode(token);
        const userId = data.id;
  
        if (!globalStream) {
          const running = userTasks
            .flatMap((p: any) => p.tasks)
            .filter((t: any) => t.isRunning);
  
          for (const task of running) {
            await stopTimer(task.id);
  
            broadcastTaskUpdate(
              {
                ...task,
                projectId: task.projectId,
                isRunning: false,
                runningDuration: 0,
                totalTime: task.totalTime + (task.runningDuration || 0),
              },
              userId
            );
  
            notifyUser(
              "Timer Stopped",
              "Running timer stopped because screen sharing ended or page refreshed"
            );
          }
        }
  
        fetchTasks();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };
  
    initialize();
  
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, [globalStream]); 

//   useEffect(() => {
//     const initialize = async () => {
//       try {
//         const userTasks:any = await fetchTasks();
//         const token:any=localStorage.getItem("token")
//         const data:any=jwtDecode(token)
//         const userId = data.id
//         const running = userTasks
//           .flatMap((p: any) => p.tasks)
//           .filter((t: any) => t.isRunning);
        
//         for (const task of running) {
//           await stopTimer(task.id);
//           broadcastTaskUpdate(
//   {
//     ...task,
//     projectId: task.projectId, 
//     isRunning: false,
//     runningDuration: 0,
//     totalTime: task.totalTime + (task.runningDuration || 0)
//   },
//   userId
// );

//           notifyUser("Timer Stopped","Running timer stopped due to refresh")
//         }
  
//         fetchTasks();
//       } catch (error) {
//         console.error("Error during initialization:", error);
//       }
//     };
  
//     initialize();
  
//     return () => {
//       Object.values(intervalsRef.current).forEach(clearInterval);
//     };
//   }, []);

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

    // Ensure each task has projectId attached
    const tasksWithProjectId = res.map((project: any) => ({
      ...project,
      tasks: project.tasks.map((task: any) => ({
        ...task,
        projectId: project.id      // IMPORTANT FIX
      }))
    }));

    setProjects(tasksWithProjectId);

    tasksWithProjectId.forEach((project: any) => {
  project.tasks.forEach((task: any) => {
    if (task.isRunning) {
      // Clear old interval if exists
      if (intervalsRef.current[task.id]) {
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];
      }

      intervalsRef.current[task.id] = setInterval(() => {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === project.id
              ? {
                  ...p,
                  tasks: p.tasks.map((t: any) =>
                    t.id === task.id
                      ? { ...t, runningDuration: (t.runningDuration || 0) + 1 }
                      : t
                  )
                }
              : p
          )
        );
      }, 1000);
    } else if (intervalsRef.current[task.id]) {
      clearInterval(intervalsRef.current[task.id]);
      delete intervalsRef.current[task.id];
    }
  });
});

    return tasksWithProjectId;  // IMPORTANT: return tasks
  } catch (error) {
    toast.error("Failed to fetch tasks");
    return [];
  } finally {
    setLoading(false);
  }
};
 
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
  
  const broadcastTaskUpdate = async (task: any, userId: string) => {
  try {
    await fetch(`${process.env.REACT_APP_BACKEND_URL}/broadcast-task-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, task }),
    });
  } catch (err) {
    console.error("Failed to broadcast task update", err);
  }
};

const handleStartStopTimer = async (task: any, projectId: string) => {
  try {
    const token: any = localStorage.getItem("token");
    const data: any = jwtDecode(token);
    const userId = data.id;

    // Find currently running task
    const runningTask = projects.flatMap((p) => p.tasks).find((t: any) => t.isRunning);

    // ---------------- CASE A: STOP CURRENT TASK ----------------
    if (task.isRunning) {
      await stopTimer(task.id);

      // Clear any interval for this task
      if (intervalsRef.current[task.id]) {
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];
      }

      // Update UI
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
                        totalTime: (t.totalTime || 0) + (t.runningDuration || 0),
                        runningDuration: 0,
                      }
                    : t
                ),
              }
            : p
        )
      );

      // Broadcast stop
      broadcastTaskUpdate(
        { ...task, isRunning: false, runningDuration: 0, totalTime: task.totalTime + (task.runningDuration || 0) },
        userId
      );

      // Show stop permission modal if no other tasks are running
      const stillRunning = projects
        .flatMap((p) => p.tasks)
        .some((t: any) => t.isRunning && t.id !== task.id);

      // if (!stillRunning) setShowStopPermissionModal(true);
      return;
    }

    // ---------------- CASE B: START NEW TASK ----------------
    // If another task is running, stop it first
    if (runningTask && runningTask.id !== task.id) {
      await stopTimer(runningTask.id);

      if (intervalsRef.current[runningTask.id]) {
        clearInterval(intervalsRef.current[runningTask.id]);
        delete intervalsRef.current[runningTask.id];
      }

      setProjects((prev) =>
        prev.map((p) => ({
          ...p,
          tasks: p.tasks.map((t: any) =>
            t.id === runningTask.id
              ? {
                  ...t,
                  isRunning: false,
                  totalTime: (t.totalTime || 0) + (t.runningDuration || 0),
                  runningDuration: 0,
                }
              : t
          ),
        }))
      );

      broadcastTaskUpdate(
        {
          ...runningTask,
          isRunning: false,
          runningDuration: 0,
          totalTime: runningTask.totalTime + (runningTask.runningDuration || 0),
        },
        userId
      );
    }

    // Request screen permission if needed
    // let hasPermission = screenshotRef.current?.hasPermission;
    // if (!hasPermission) {
    //   const granted = await screenshotRef.current?.requestScreenShare?.();
    //   if (!granted) {
    //     toast.error("You must share your ENTIRE SCREEN to start a task.");
    //     return;
    //   }
    //   hasPermission = true;
    // }

    // Start timer API call
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
                      runningDuration: t.runningDuration || 0,
                      status: updatedTask.status,
                    }
                  : t
              ),
            }
          : p
      )
    );

    // Broadcast start
    broadcastTaskUpdate(
      { ...task, isRunning: true, runningDuration: 0, status: updatedTask.status },
      userId
    );

    if (intervalsRef.current[task.id]) {
      clearInterval(intervalsRef.current[task.id]);
      delete intervalsRef.current[task.id];
    }

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
    console.error("Error in timer:", error);
    toast.error("Something went wrong while starting/stopping timer.");
  }
};

  const handleStatusClick = async (taskId: string, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const task = project?.tasks.find((t: any) => t.id === taskId);
    if (!task) return;

    
    const result = await Swal.fire({
        title: "Are you sure?",
        text: `Do you want to change the status of "${task.title}" to code_review?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, change it!",
        customClass:{
          popup:"main-color",
          cancelButton: "delete-btn", 
          confirmButton: "common-btn-in",     
        }
      });
    
      if (!result.isConfirmed) return;

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

  const mailSend = async () => {
      try {
        setLoading1(true);
  
        const token: any = localStorage.getItem("token");
        const parsed: any = jwtDecode(token);
        const userId=parsed?.id
        const res = await sendMailToTeamLeads(userId);
  
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.error || "Failed to send mail");
        }
      } catch {
        toast.error("Server error");
      } finally {
        setLoading1(false); // stop loader
      }
    };

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

  if (loading) return <div className="d-flex justify-content-center min-vh-100">Loading tasks...</div>;

  return (
    <div className="container mt-4" style={{minHeight:"100vh"}}>
      <NotificationPermissionBanner />
      <AutoScreenshot
        ref={screenshotRef}
        onPermissionDenied={() => handleScreenShareStopped()}
      />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div><h2 className="m-0">Your Tasks</h2>
        <p>Manage everything related to users tasks — view details, edit tasks, and also delete unwanteds.</p>
        </div>
        <div className="d-flex flex-column gap-2"><button
                  className="btn btn-outline-dark p-2"
                  onClick={() => mailSend()}
                >
                  {loading1 ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" />
              ) : (
                <span className="me-2" ><FaShare /></span>
              )}
              {loading1 ? "Sending..." : "Share Tasks Update"}
                </button>
        <button
          className="btn common-btn-out"
          onClick={() => setShowTaskModal(true)}
        >
          Create Your Own Task
        </button></div>
      </div>

      {/* Filters */}
      <div className="d-flex flex-wrap gap-3 mb-3">
  {/* First row: Project + Status */}
  <div className="d-flex flex-wrap gap-3 w-100">
    <div style={{ minWidth: "200px",flex: "1" }}>
      <label className="form-label fw-normal">Project</label>
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
      <label className="form-label fw-normal">Status</label>
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
      <label className="form-label fw-normal">Start Date</label>
      <input
        type="date"
        className="form-control"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
      />
    </div>

    <div style={{ minWidth: "200px"}}>
      <label className="form-label fw-normal">End Date</label>
      <input
        type="date"
        className="form-control"
        value={filterEndDate}
        onChange={(e) => setFilterEndDate(e.target.value)}
      />
    </div>
  </div>
</div>


      <div className="table-responsive card border-0 second-color">
        <table className="table table-hover align-middle text-left second-color table-border" >
          <thead>
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
                          task.isRunning ? "stop" : "start"
                        }`}
                        onClick={() =>
                          handleStartStopTimer(task, task.projectId)
                        }
                      >
                        {task.isRunning ? "Stop" : "Start"}
                      </button>
                      <button
                        className="btn btn-sm status"
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
        onConfirm={async () => {
            screenshotRef.current?.stopScreenShare();
        
            const token: any = localStorage.getItem("token");
            const data: any = jwtDecode(token);
            const userId = data.id;
        
            try {
              await fetch(`${process.env.REACT_APP_BACKEND_URL}/broadcast-stop-confirm`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
              });
            } catch (err) {
              console.error("Failed to broadcast stop confirmation", err);
            }
        
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

