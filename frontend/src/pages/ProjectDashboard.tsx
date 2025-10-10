"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getProjects,
  getTasksByProject,
  createTask,
  deleteProject,
  createProject,
  startTimer,
  stopTimer,
  deleteTask,
} from "../services/api";

interface Timer {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
}

interface Task {
  id: string;
  title: string;
  totalTime: number; // cumulative duration from backend
  isRunning: boolean;
  runningDuration?: number; // live running session
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

const ProjectDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({});
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>({});

  // Keep track of intervals per running task
  const intervalsRef = useRef<{ [taskId: string]: NodeJS.Timer }>({});

  useEffect(() => {
    fetchProjects();
  }, []);
useEffect(() => {
  const interval = setInterval(() => {
    setTasks((prev) => {
      const updated: typeof prev = {};
      Object.keys(prev).forEach((projectId) => {
        updated[projectId] = prev[projectId].map((task) =>
          task.isRunning
            ? { ...task, runningDuration: (task.runningDuration || 0) + 1 }
            : task
        );
      });
      return updated;
    });
  }, 1000);

  return () => clearInterval(interval);
}, []);

  // Live running timers
 useEffect(() => {
  Object.values(tasks)
    .flat()
    .filter((task) => task.isRunning)
    .forEach((task) => {
      if (!intervalsRef.current[task.id]) {
        intervalsRef.current[task.id] = setInterval(() => {
            
          setTasks((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((projectId) => {
              updated[projectId] = updated[projectId].map((t) =>
                t.id === task.id
                  ? { ...t, runningDuration: (t.runningDuration || 0) + 1 }
                  : t
              );
            });
            return updated;
          });
        }, 1000);
      }
    });

  // Cleanup stopped timers
  Object.keys(intervalsRef.current).forEach((taskId) => {
    const stillRunning = Object.values(tasks)
      .flat()
      .find((t) => t.id === taskId && t.isRunning);
    if (!stillRunning) {
      clearInterval(intervalsRef.current[taskId]);
      delete intervalsRef.current[taskId];
    }
  });

  return () => {
    Object.values(intervalsRef.current).forEach(clearInterval);
  };
}, [tasks]);


  // Fetch projects
  const fetchProjects = async () => {
    const data = await getProjects();
    setProjects(data);
  };

  // Toggle project expand/collapse and fetch tasks if not loaded
  const toggleExpandProject = async (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    if (!tasks[projectId]) {
      const projectTasks = await getTasksByProject(projectId);
      // Initialize runningDuration to 0
      const initializedTasks:Task[] = projectTasks.map((t:Task) => ({
        ...t,
        runningDuration: 0,
      }));
      setTasks((prev) => ({ ...prev, [projectId]: initializedTasks }));
    }
  };

  // Create new project
  const handleCreateProject = async () => {
  if (!newProjectName) return;

  const newProject = await createProject(newProjectName, newProjectDescription);

  setProjects((prev) => [...prev, newProject]); 

  setNewProjectName("");
  setNewProjectDescription("");
};


  // Delete project
  const handleDeleteProject = async (id: string) => {

    await deleteProject(id);
    await fetchProjects();
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (expandedProject === id) setExpandedProject(null);
  };

  // Add task to project
  const handleAddTask = async (projectId: string) => {
  const title = newTaskTitle[projectId];
  if (!title) return;

  const newTask = await createTask(projectId, title ); 

  setTasks((prev) => ({
    ...prev,
    [projectId]: [
      ...(prev[projectId] || []),
      { ...newTask, runningDuration: 0 }
    ],
  }));

  setNewTaskTitle((prev) => ({ ...prev, [projectId]: "" }));
};


  // Start or stop a timer
  const handleStartStopTimer = async (task: Task, projectId: string) => {
    
    if (task.isRunning) {
      const res = await stopTimer(task.id);
      setTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((projectId) => {
          updated[projectId] = updated[projectId].map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  isRunning: false,
                  totalDuration: res.totalDuration,
                  runningDuration: 0,
                }
              : t
          );
        });
        return updated;
      });

      // Clear interval
      if (intervalsRef.current[task.id]) {
        clearInterval(intervalsRef.current[task.id]);
        delete intervalsRef.current[task.id];
      }

    const refreshedTasks = await getTasksByProject(projectId);
    setTasks((prev) => ({
    ...prev,
    [projectId]: refreshedTasks.map((t: Task) => ({
      ...t,
      runningDuration: t.isRunning ? t.runningDuration || 0 : 0,
    })),
  }));
    } else {
      await startTimer(task.id);
      setTasks((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((projectId) => {
          updated[projectId] = updated[projectId].map((t) =>
            t.id === task.id ? { ...t, isRunning: true, runningDuration: 0 } : t
          );
        });
        return updated;
      });
    }
  };

  // Format seconds to HH:MM:SS
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="container mt-4">
      {/* Create Project */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="form-control mb-2"
        />
        <input
          type="text"
          placeholder="Project Description"
          value={newProjectDescription}
          onChange={(e) => setNewProjectDescription(e.target.value)}
          className="form-control mb-2"
        />
        <button className="btn btn-primary" onClick={handleCreateProject}>
          Create Project
        </button>
      </div>

      {/* Projects */}
      {projects.map((project) => (
        <div key={project.id} className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{project.name}</strong>
              {project.description && <p className="mb-0">{project.description}</p>}
            </div>
            <div>
              <button
                className="btn btn-sm btn-info me-2"
                onClick={() => toggleExpandProject(project.id)}
              >
                {expandedProject === project.id ? "Collapse" : "View Tasks"}
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDeleteProject(project.id)}
              >
                Delete
              </button>
            </div>
          </div>

          {/* Expanded Tasks */}
          {expandedProject === project.id && (
            <div className="card-body">
              {/* Add Task */}
              <div className="mb-3 d-flex">
                <input
                  type="text"
                  placeholder="New Task Title"
                  value={newTaskTitle[project.id] || ""}
                  onChange={(e) =>
                    setNewTaskTitle((prev) => ({ ...prev, [project.id]: e.target.value }))
                  }
                  className="form-control me-2"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => handleAddTask(project.id)}
                >
                  Add Task
                </button>
              </div>

              {/* Task List */}
              {tasks[project.id]?.map((task) => {
                const total = Number(task.totalTime) + Number((task.runningDuration || 0));
                return (
                  <div
                    key={task.id}
                    className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
                  >
                    <div>
                      <strong>{task.title}</strong>

                      <div className="mt-1">
  {task.isRunning && (
    <span className="badge bg-success me-1">
      {formatDuration(task.runningDuration || 0)}
    </span>
  )}
</div>


                      <div className="mt-1">
                        <strong>Total: {formatDuration(total)}</strong>
                      </div>
                    </div>

                    <div>
                      <button
                        className={`btn btn-sm ${
                          task.isRunning ? "btn-danger" : "btn-success"
                        }`}
                        onClick={() => handleStartStopTimer(task, project.id)}
                      >
                        {task.isRunning ? "Stop" : "Start"}
                      </button>
                      <button
          className="btn btn-sm btn-danger"
          onClick={async () => {

            setTasks((prev) => ({
              ...prev,
              [project.id]: prev[project.id].filter((t) => t.id !== task.id),
            }));
           await deleteTask(task.id as string);
          }}
        >
          Delete
        </button>
                    </div>
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

export default ProjectDashboard;
