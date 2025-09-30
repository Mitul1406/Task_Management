"use client";

import React, { useState, useEffect, useRef } from "react";
import { getProjects, getTasksByProject, startTimer, stopTimer } from "../services/api";

interface Task {
  id: string;
  title: string;
  estimatedTime: number; // in seconds
  totalTime: number;     // cumulative duration from backend
  isRunning: boolean;
  runningDuration?: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

const UserDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<{ [key: string]: Task[] }>({});
  const intervalsRef = useRef<{ [taskId: string]: NodeJS.Timer }>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  // Fetch projects
  const fetchProjects = async () => {
    const data = await getProjects();
    setProjects(data);
  };

  // Expand project and fetch tasks
  const toggleExpandProject = async (projectId: string) => {
    if (expandedProject === projectId) {
      setExpandedProject(null);
      return;
    }
    setExpandedProject(projectId);
    if (!tasks[projectId]) {
      const projectTasks = await getTasksByProject(projectId);
      setTasks((prev) => ({
        ...prev,
        [projectId]: projectTasks.map((t: Task) => ({ ...t, runningDuration: 0 })),
      }));
    }
  };

  // Start/Stop timer
  const handleStartStopTimer = async (task: Task, projectId: string) => {
    if (task.isRunning) {
      const res = await stopTimer(task.id);
      clearInterval(intervalsRef.current[task.id]);
      delete intervalsRef.current[task.id];
      const totalDuration = typeof res.totalDuration === "number" ? res.totalDuration : task.totalTime;
      setTasks((prev) => ({
        ...prev,
        [projectId]: prev[projectId].map((t) =>
          t.id === task.id
            ? { ...t, isRunning: false, totalTime: totalDuration, runningDuration: 0 }
            : t
        ),
      }));

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
    
      setTasks((prev) => ({
        ...prev,
        [projectId]: prev[projectId].map((t) =>
          t.id === task.id ? { ...t, isRunning: true, runningDuration: 0 } : t
        ),
      }));

      // Start live interval
      intervalsRef.current[task.id] = setInterval(() => {
        setTasks((prev) => ({
          ...prev,
          [projectId]: prev[projectId].map((t) =>
            t.id === task.id
              ? { ...t, runningDuration: (t.runningDuration || 0) + 1 }
              : t
          ),
        }));
      }, 1000);
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
      {projects.map((project) => (
        <div key={project.id} className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center">
            <div>
              <strong>{project.name}</strong>
              {project.description && <p className="mb-0">{project.description}</p>}
            </div>
            <button
              className="btn btn-sm btn-info"
              onClick={() => toggleExpandProject(project.id)}
            >
              {expandedProject === project.id ? "Collapse" : "View Tasks"}
            </button>
          </div>

          {expandedProject === project.id && (
            <div className="card-body">
  {tasks[project.id]?.length === 0 && <p>No tasks found.</p>}
  {tasks[project.id]?.map((task) => {
    const total = Number(task.totalTime) + Number(task.runningDuration || 0);
    const estimated = Number(task.estimatedTime || 0);
    const overTime = total - estimated > 0 ? total - estimated : 0;
    const saveTime = estimated - total > 0 ? estimated - total:0;
    return (
      <div
        key={task.id}
        className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded"
      >
        <div>
          <strong>{task.title}</strong>

          <div className="mt-1">
            <span>Estimated: {formatDuration(estimated)}</span>
          </div>

          {task.isRunning && (
            <div className="mt-1">
              <span className="badge bg-success">
                Running: {formatDuration(task.runningDuration || 0)}
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
          {saveTime>0 &&
             <div className="mt-1">
              <span className="text-success">Saved Time: {formatDuration(saveTime)}</span>
            </div>
          }
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
