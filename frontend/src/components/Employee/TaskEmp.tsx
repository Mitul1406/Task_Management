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
  const status = queryParams.get("status");
  // const { taskId } = useParams();
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(taskId || null);

useEffect(() => {
  const token: any = localStorage.getItem("token");
  const data: any = jwtDecode(token);
  const userId = data.id;

  let es: EventSource;

  const connectSSE = () => {
    es = new EventSource(`http://localhost:4040/events/${userId}`);

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("SSE event:", data);

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
                    if (t.id === updatedTask.id) {
                      if (updatedTask.isRunning && !intervalsRef.current[t.id]) {
                        intervalsRef.current[t.id] = setInterval(() => {
                          setProjects((prevProjects) =>
                            prevProjects.map((proj) =>
                              proj.id === updatedTask.projectId
                                ? {
                                    ...proj,
                                    tasks: proj.tasks.map((taskItem: any) =>
                                      taskItem.id === updatedTask.id
                                        ? {
                                            ...taskItem,
                                            runningDuration:
                                              (taskItem.runningDuration || 0) + 1,
                                          }
                                        : taskItem
                                    ),
                                  }
                                : proj
                            )
                          );
                        }, 1000);
                      }

                      if (!updatedTask.isRunning && intervalsRef.current[t.id]) {
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
      es.close();
      setTimeout(connectSSE, 2000);
    };
  };

  connectSSE();

  return () => es.close();
}, []);

  useEffect(() => {
  if (taskId ) {
    setHighlightTaskId(taskId);
  }
  if(status) setStatusFilter(status)
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
  
      // Start intervals for running tasks
      tasksWithProjectId.forEach((project: any) => {
        project.tasks.forEach((task: any) => {
          if (task.isRunning && !intervalsRef.current[task.id]) {
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


useEffect(() => {
    const initialize = async () => {
      try {
        const userTasks:any = await fetchTasks();
        const token:any=localStorage.getItem("token")
        const data:any=jwtDecode(token)
        const userId = data.id
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
    totalTime: task.totalTime + (task.runningDuration || 0)
  },
  userId
);

          notifyUser("Timer Stopped","Running timer stopped due to refresh")
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
  const broadcastTaskUpdate = async (task: any, userId: string) => {
  try {
    await fetch("http://localhost:4040/broadcast-task-update", {
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
    const data:any =jwtDecode(token)
    const userId = data.id;

    const runningTask = projects.flatMap((p) => p.tasks).find((t: any) => t.isRunning);

    // CASE A: STOP CURRENT TASK
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

      const stillRunning = projects
        .flatMap((p) => p.tasks)
        .some((t: any) => t.isRunning && t.id !== task.id);

      if (!stillRunning) setShowStopPermissionModal(true);
      return;
    }

    // CASE B: START NEW TASK
    if (runningTask && runningTask.id !== task.id) {
      await stopTimer(runningTask.id);
      clearInterval(intervalsRef.current[runningTask.id]);
      delete intervalsRef.current[runningTask.id];

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

      // Broadcast stop of previous running task
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

    // Broadcast start
    broadcastTaskUpdate(
      { ...task, isRunning: true, runningDuration: 0, status: updatedTask.status },
      userId
    );

    // Start interval
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
      <div className="table-responsive card p-3 bg-light">
        <table className="table table-hover table-bordered align-middle" style={{border:"1px solid #000"}}>
          <thead style={{ backgroundColor: "#1b263b", color: "white" }}>
            <tr>
              <th>Project</th>
              <th style={{minWidth:"300px"}}>Task</th>
              <th>Estimated</th>
              <th>Consumed</th>
              <th style={{minWidth:"110px"}}>Start</th>
              <th style={{minWidth:"110px"}}>End</th>
              <th>Status</th>
              <th style={{minWidth:"240px"}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map((task: any) => (
                <tr
                  key={task.id}
                  onClick={()=>setHighlightTaskId(null)}
                  className={highlightTaskId === task.id ? "table-warning" : ""}
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
            totalResults={fetchTasks.length}
            pageSize={ITEMS_PER_PAGE}
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
      await fetch("http://localhost:4040/broadcast-stop-confirm", {
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
    </div>
  );
};

export default TaskEmp;
