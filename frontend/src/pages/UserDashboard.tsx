  "use client";
  import React, { useState, useEffect, useRef } from "react";
  import { getUserTasks, startTimer, stopTimer } from "../services/api";
  import { jwtDecode } from "jwt-decode";
  import { useNavigate } from "react-router-dom";
  import { toast } from "react-toastify";

  interface Task {
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

  const UserDashboard: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const intervalsRef = useRef<{ [taskId: string]: NodeJS.Timer }>({});
    const [username, setUsername] = useState<string>("");
    const [id, setId] = useState<string>("");
    const navigate=useNavigate()
    interface User {
    id: string;
    username: string;
    email: string;
    role: string;
  }
    useEffect(() => {
          const token = localStorage.getItem("token");
          if (token) {
            const parsed = jwtDecode<User>(token)            
            setId(parsed.id || "")
            setUsername(parsed.username || "");
          }
        }, []);
    useEffect(() => {
  const handleBeforeUnload = async () => {
    const runningTasks = projects
      .flatMap((project) => project.tasks.map((t) => ({ ...t, projectId: project.id })))
      .filter((task) => task.isRunning);

    for (const task of runningTasks) {
      try {
        await stopTimer(task.id);
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];
      } catch (err) {
        console.error("Error stopping timer before unload:", err);
      }
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}, [projects]);

    const formatDate = (val: any) => {
    if (!val) return "";
    // handle case where val is already ISO string like "2025-10-03"
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const n = Number(val);
    if (isNaN(n)) return "";
    return new Date(n).toISOString().split("T")[0];
  };
    useEffect(() => {    
      fetchUserTasks();
    }, []);

    const fetchUserTasks = async () => {
      const data = await getUserTasks(); 
      // Initialize runningDuration for live timers
      const updated = data.map((project: Project) => ({
        ...project,
        tasks: project.tasks.map((t) => ({
          ...t,
          runningDuration: t.isRunning ? 0 : undefined,
        })),
      }));
      setProjects(updated);
    };

    const toggleExpandProject = (projectId: string) => {
      setExpandedProject((prev) => (prev === projectId ? null : projectId));
    };

    const handleStartStopTimer = async (task: Task, projectId: string) => {
      if (task.isRunning) {
      // Stop the timer
      await stopTimer(task.id);
      clearInterval(intervalsRef.current[task.id]);
      delete intervalsRef.current[task.id];

      // Refetch all tasks for this user (or project)
      const refreshedProjects = await getUserTasks();

      // Update state with fresh totalTime and running info
      setProjects(
        refreshedProjects.map((project: Project) =>
          project.id === projectId
            ? {
                ...project,
                tasks: project.tasks.map((t) => ({
                  ...t,
                  runningDuration: t.isRunning ? 0 : undefined,
                })),
              }
            : project
        )
      );
    } else {
        await startTimer(task.id);

        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  tasks: project.tasks.map((t) =>
                    t.id === task.id ? { ...t, isRunning: true, runningDuration: 0 } : t
                  ),
                }
              : project
          )
        );

        // Start live interval
        intervalsRef.current[task.id] = setInterval(() => {
          setProjects((prev) =>
            prev.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    tasks: project.tasks.map((t) =>
                      t.id === task.id
                        ? { ...t, runningDuration: ((t as any).runningDuration || 0) + 1 }
                        : t
                    ),
                  }
                : project
            )
          );
        }, 1000);
      }
    };

    const formatDuration = (seconds: number) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
        .toString()
        .padStart(2, "0")}`;
    };

    return (
      <div className="container mt-4">
    <div className="d-flex justify-content-between align-items-center mb-3">
  <h2>Welcome: {username}</h2>
  <div className="d-flex ms-auto">
    <button
      className="btn btn-sm btn-success me-2"
      onClick={() => window.open(`/user-timesheet-report/${id}`, "_blank")}
    >
      View Timesheet
    </button>
    <button
      className="btn btn-danger"
      onClick={() => {
        localStorage.removeItem("token"); 
        toast.success("Logout successfully...");
        navigate("/login");  
      }}
    >
      Logout
    </button>
  </div>
</div>

        <h1 className="text-center">Task Tracker</h1>
        {projects.map((project) => (
          <div key={project.id} className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <strong>{project.name}</strong>
                {project.description && <p className="mb-0">{project.description}</p>}
              </div>
              <div className="d-flex align-items-center">
              
              <button className="btn btn-sm btn-info" onClick={() => toggleExpandProject(project.id)}>
                {expandedProject === project.id ? "Collapse" : "View Tasks"}
              </button>
              </div>
            </div>

            {expandedProject === project.id && (
              <div className="card-body">
                {project.tasks.length === 0 && <p>No tasks assigned.</p>}
                {project.tasks.map((task) => {
                  const total = Number(task.totalTime) + Number((task as any).runningDuration || 0);
                  const estimated = Number(task.estimatedTime || 0);
                  const overTime = total - estimated > 0 ? total - estimated : 0;
                  const saveTime = estimated - total > 0 ? estimated - total : 0;

                  return (
                    <div
                      key={task.id}
                      className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
                    >
                      <div>
                        <div
      style={{
        whiteSpace: "normal",
        wordBreak: "break-word",
        flex: "1 1 auto", 
        minWidth: 0, 
      }}
    >
      <strong>{task.title}</strong>
    </div>
                        <div className="mt-1">
                          <span>Task Date: {formatDate((task as any).startDate)}</span>
                        </div>
                        <div className="mt-1">
                          <span>Task complition Date: {formatDate((task as any).endDate)}</span>
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
                          <div className="mt-1">
                            <span className="text-danger">Over Time: {formatDuration(overTime)}</span>
                          </div>
                        )}
                        {saveTime > 0 && (
                          <div className="mt-1">
                            <span className="text-success">Saved Time: {formatDuration(saveTime)}</span>
                          </div>
                        )}
                      </div>

                      <button
                        className={`btn btn-sm ${task.isRunning ? "btn-danger" : "btn-success"}`}
                        onClick={() => handleStartStopTimer(task, project.id)}
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
