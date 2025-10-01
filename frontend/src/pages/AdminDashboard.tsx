"use client";

import React, { useState, useEffect } from "react";
import {
  getProjects,
  createProject,
  deleteProject,
  createTaskAdmin,
  updateTaskAdmin,
  deleteTask,
  getUsers,
  getTasksByProject,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
interface Task {
  id: string;
  title: string;
  totalTime: number;
  estimatedTime?: number;
  isRunning: boolean;
  assignedUserId?: string;
  assignedUser?: { id: string; username: string };
}

interface Project {
  id: string;
  name: string;
  description?: string;
  tasks?: Task[];
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
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
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ [key: string]: string }>({});
  const [username,setUsername]=useState("")
  const [taskEdits, setTaskEdits] = useState<{ 
    [taskId: string]: { title: string; hours: number; minutes: number; seconds: number; assignedUser?: string } 
  }>({});
  const navigate=useNavigate()
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);
  useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
        const parsed = jwtDecode<User>(token)
        setUsername(parsed.username || "");
      }
    }, []);
  
  const fetchUsers = async () => {
    const u = await getUsers();
    setUsers(u);
  };

  const fetchProjects = async () => {
    const projectsData = await getProjects();
    const projectsWithTasks = await Promise.all(
      projectsData.map(async (project: { id: string; }) => {
        const tasks = await getTasksByProject(project.id);
        return { ...project, tasks };
      })
    );
    setProjects(projectsWithTasks);
  };

  const toggleExpandProject = (id: string) => {
    setExpandedProject(prev => (prev === id ? null : id));
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return;
    const project = await createProject(newProjectName, newProjectDescription);
    setProjects(prev => [...prev, { ...project, tasks: [] }]);
    setNewProjectName("");
    setNewProjectDescription("");
  };

  const handleAddTask = async (projectId: string) => {
    const title = newTaskTitle[projectId];
    if (!title) return;

    const hours = newTaskHours[projectId] || 0;
    const minutes = newTaskMinutes[projectId] || 0;
    const seconds = newTaskSeconds[projectId] || 0;
    const estimatedTime = hours * 3600 + minutes * 60 + seconds;
    const assignedUserId = selectedUser[projectId] || undefined;

    const task = await createTaskAdmin(projectId, title, estimatedTime, assignedUserId);

    setProjects(prev =>
      prev.map(p => (p.id === projectId ? { ...p, tasks: [...(p.tasks || []), task] } : p))
    );

    // Initialize taskEdits for the new task so dropdown shows assigned user
    setTaskEdits(prev => ({
      ...prev,
      [task.id]: {
        title: task.title,
        hours,
        minutes,
        seconds,
        assignedUser: task.assignedUser?.id || assignedUserId || "",
      }
    }));

    // Reset form
    setNewTaskTitle(prev => ({ ...prev, [projectId]: "" }));
    setNewTaskHours(prev => ({ ...prev, [projectId]: 0 }));
    setNewTaskMinutes(prev => ({ ...prev, [projectId]: 0 }));
    setNewTaskSeconds(prev => ({ ...prev, [projectId]: 0 }));
    setSelectedUser(prev => ({ ...prev, [projectId]: "" }));
  };

  const handleUpdateTask = async (taskId: string, projectId: string) => {
    const edit = taskEdits[taskId];
    const estimatedTime = edit.hours * 3600 + edit.minutes * 60 + edit.seconds;
    const updated = await updateTaskAdmin(taskId, edit.title, estimatedTime, edit.assignedUser);
    
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

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    if (expandedProject === id) setExpandedProject(null);
  };
  const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [
    h.toString().padStart(2, "0"),
    m.toString().padStart(2, "0"),
    s.toString().padStart(2, "0"),
  ].join(":");
};

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
    <h2>Welcome Admin: {username}</h2>
    <button
      className="btn btn-danger"
      onClick={() => {
        localStorage.removeItem("token"); 
        navigate("/login");  
      }}
    >
      Logout
    </button>
  </div>

  <h1 className="text-center">Task Tracker</h1>

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
        <button className="btn btn-primary" onClick={handleCreateProject}>
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

                <div className="d-flex flex-column">
                  <label>Assign User</label>
                  <select
                    className="form-select"
                    value={selectedUser[project.id] || ""}
                    onChange={e => setSelectedUser(prev => ({ ...prev, [project.id]: e.target.value }))}
                  >
                    <option value="">Select User</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.username}</option>
                    ))}
                  </select>
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

              {/* Task Table */}
              {project.tasks && project.tasks.length > 0 && (
  <table className="table table-bordered mt-3">
    <thead className="table-light">
      <tr>
        <th>Task Name</th>
        <th>HH</th>
        <th>MM</th>
        <th>SS</th>
        <th>Time Consume</th>
        <th>Saved Time</th>
        <th>Overtime</th>
        <th>Assigned User</th>
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
          assignedUser: task.assignedUser?.id || task.assignedUserId || "",
        };

        return (
          <tr key={task.id}>
            {/* Task Name */}
            <td>
              <input
                type="text"
                className="form-control"
                value={edit.title}
                onChange={e =>
                  setTaskEdits(prev => ({
                    ...prev,
                    [task.id]: { ...edit, title: e.target.value }
                  }))
                }
              />
            </td>

            {/* HH */}
            <td>
              <input
                type="number"
                className="form-control"
                value={edit.hours}
                onChange={e =>
                  setTaskEdits(prev => ({
                    ...prev,
                    [task.id]: { ...edit, hours: Number(e.target.value) }
                  }))
                }
              />
            </td>

            {/* MM */}
            <td>
              <input
                type="number"
                className="form-control"
                value={edit.minutes}
                onChange={e =>
                  setTaskEdits(prev => ({
                    ...prev,
                    [task.id]: { ...edit, minutes: Number(e.target.value) }
                  }))
                }
              />
            </td>

            {/* SS */}
            <td>
              <input
                type="number"
                className="form-control"
                value={edit.seconds}
                onChange={e =>
                  setTaskEdits(prev => ({
                    ...prev,
                    [task.id]: { ...edit, seconds: Number(e.target.value) }
                  }))
                }
              />
            </td>
             <td>
              <span className="badge bg-info">
                {formatDuration((task as any).totalTime || 0)}
              </span>
            </td>
            {/* Saved Time */}
            <td>
              <span className="badge bg-success">
                {formatDuration((task as any).savedTime || 0)}
              </span>
            </td>

            {/* Overtime */}
            <td>
              <span className="badge bg-warning text-dark">
                {formatDuration((task as any).overtime || 0)}
              </span>
            </td>

            {/* Assigned User */}
            <td>
              <select
                className="form-select"
                value={edit.assignedUser || ""}
                onChange={e =>
                  setTaskEdits(prev => ({
                    ...prev,
                    [task.id]: { ...edit, assignedUser: e.target.value }
                  }))
                }
              >
                <option value="">Select User</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </td>

            {/* Actions */}
            <td>
              <button
                className="btn btn-sm btn-success me-2"
                onClick={() => handleUpdateTask(task.id, project.id)}
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
