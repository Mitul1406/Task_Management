"use client";

import React, { useState, useEffect } from "react";
import {
  getProjects,
  createProject,
  deleteProject,
  createTaskAdmin,
  updateTaskAdmin,
  deleteTask,
  getTasksByProject,
} from "../services/api";

interface Task {
  id: string;
  title: string;
  totalTime: number;
  estimatedTime?: number;
  isRunning: boolean;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  tasks?: Task[];
}

const AdminDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Form states
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>({});
  const [newTaskHours, setNewTaskHours] = useState<{ [key: string]: number }>({});
  const [newTaskMinutes, setNewTaskMinutes] = useState<{ [key: string]: number }>({});
  const [newTaskSeconds, setNewTaskSeconds] = useState<{ [key: string]: number }>({});
  const [taskEdits, setTaskEdits] = useState<{ 
  [taskId: string]: { title: string; hours: number; minutes: number; seconds: number } 
}>({});

  useEffect(() => {
    fetchProjects();
  }, []);

const handleCreateProject = async () => {
  if (!newProjectName) return; // Prevent creating without a name
  const project = await createProject(newProjectName, newProjectDescription);

  setProjects(prev => [...prev, { ...project, tasks: [] }]);

  setNewProjectName("");
  setNewProjectDescription("");
};

  // Fetch projects with tasks
  const fetchProjects = async () => {
    const projectsData = await getProjects();
    const projectsWithTasks = await Promise.all(
      projectsData.map(async (project: Project) => {
        const tasks = await getTasksByProject(project.id);
        return { ...project, tasks };
      })
    );
    setProjects(projectsWithTasks);
  };

  // Toggle expand project
  const toggleExpandProject = (id: string) => {
    setExpandedProject(prev => (prev === id ? null : id));
  };

  // Add Task
  const handleAddTask = async (projectId: string) => {
    const title = newTaskTitle[projectId];
    if (!title) return;

    const hours = newTaskHours[projectId] || 0;
    const minutes = newTaskMinutes[projectId] || 0;
    const seconds = newTaskSeconds[projectId] || 0;
    const estimatedTime = hours * 3600 + minutes * 60 + seconds;

    const task = await createTaskAdmin(projectId, title, estimatedTime);

    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, tasks: [...(p.tasks || []), task] } : p))
    );

    // Reset inputs
    setNewTaskTitle(prev => ({ ...prev, [projectId]: "" }));
    setNewTaskHours(prev => ({ ...prev, [projectId]: 0 }));
    setNewTaskMinutes(prev => ({ ...prev, [projectId]: 0 }));
    setNewTaskSeconds(prev => ({ ...prev, [projectId]: 0 }));
  };

  // Update Task
  const handleUpdateTask = async (taskId: string, projectId: string, title: string, estimate?: number) => {
    const updated = await updateTaskAdmin(taskId, title, estimate);
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks?.map(t => (t.id === taskId ? { ...t, ...updated } : t)),
            }
          : p
      )
    );
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string, projectId: string) => {
    await deleteTask(taskId);
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, tasks: p.tasks?.filter(t => t.id !== taskId) }
          : p
      )
    );
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (expandedProject === id) setExpandedProject(null);
  };

  // Convert seconds to HH:MM:SS
  const secondsToHHMMSS = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return { h, m, s };
  };

  return (
    <div className="container mt-4">
      {/* Create Project */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Project Name"
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
          className="form-control mb-2"
        />
        <input
          type="text"
          placeholder="Project Description"
          value={newProjectDescription}
          onChange={e => setNewProjectDescription(e.target.value)}
          className="form-control mb-2"
        />
        <button className="btn btn-primary" onClick={() => handleCreateProject()}>
          Create Project
        </button>
      </div>

      {/* Projects */}
      {projects.map(project => (
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
              <div className="mb-3 d-flex align-items-end gap-2 p-3 flex-wrap">
                <div className="d-flex flex-column" style={{ flex: 1 }}>
                  <label>Task Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newTaskTitle[project.id] || ""}
                    onChange={e => setNewTaskTitle(prev => ({ ...prev, [project.id]: e.target.value }))}
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Hours</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTaskHours[project.id] || 0}
                    onChange={e => setNewTaskHours(prev => ({ ...prev, [project.id]: Number(e.target.value) }))}
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Minutes</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTaskMinutes[project.id] || 0}
                    onChange={e => setNewTaskMinutes(prev => ({ ...prev, [project.id]: Number(e.target.value) }))}
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Seconds</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTaskSeconds[project.id] || 0}
                    onChange={e => setNewTaskSeconds(prev => ({ ...prev, [project.id]: Number(e.target.value) }))}
                  />
                </div>
                <div className="d-flex flex-column mt-auto">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleAddTask(project.id)}
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {/* Task List Table */}
              {project.tasks && project.tasks.length > 0 && (
                <table className="table table-bordered mt-3">
                  <thead className="table-light">
                    <tr>
                      <th>Task Name</th>
                      <th>Hours</th>
                      <th>Minutes</th>
                      <th>Seconds</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.tasks.map(task => {
  const edit = taskEdits[task.id] || {
    title: task.title,
    hours: Math.floor((task.estimatedTime || 0) / 3600),
    minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
    seconds: (task.estimatedTime || 0) % 60,
  };

  return (
    <tr key={task.id}>
      <td>
        <input
          type="text"
          className="form-control"
          value={edit.title}
          onChange={e =>
            setTaskEdits(prev => ({
              ...prev,
              [task.id]: { ...edit, title: e.target.value },
            }))
          }
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control"
          value={edit.hours}
          onChange={e =>
            setTaskEdits(prev => ({
              ...prev,
              [task.id]: { ...edit, hours: Number(e.target.value) },
            }))
          }
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control"
          value={edit.minutes}
          onChange={e =>
            setTaskEdits(prev => ({
              ...prev,
              [task.id]: { ...edit, minutes: Number(e.target.value) },
            }))
          }
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control"
          value={edit.seconds}
          onChange={e =>
            setTaskEdits(prev => ({
              ...prev,
              [task.id]: { ...edit, seconds: Number(e.target.value) },
            }))
          }
        />
      </td>
      <td>
        <button
          className="btn btn-sm btn-success me-2"
          onClick={() =>
            handleUpdateTask(
              task.id,
              project.id,
              edit.title,
              edit.hours * 3600 + edit.minutes * 60 + edit.seconds
            )
          }
        >
          Update
        </button>
        <button
          className="btn btn-sm btn-danger"
          onClick={() => handleDeleteTask(task.id, project.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  );
})}

                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
