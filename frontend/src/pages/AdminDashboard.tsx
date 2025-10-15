"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getProjects,
  createProject,
  deleteProject,
  createTaskAdmin,
  updateTaskAdmin,
  deleteTask,
  getUsers,
  getTasksByProject,
  updateTaskStatus,
  changePassword,
} from "../services/api";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import AutoScreenshot from "./ScreenShot";
interface Task {
  status: string;
  endDate: string | number | Date;
  startDate: any;
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
const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};

const AdminDashboard: React.FC = () => {
  const {logout} = useAuth()
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState<{ [key: string]: string }>(
    {}
  );
  const [newTaskHours, setNewTaskHours] = useState<{ [key: string]: number }>(
    {}
  );
  const [newTaskMinutes, setNewTaskMinutes] = useState<{
    [key: string]: number;
  }>({});
  const [newTaskSeconds, setNewTaskSeconds] = useState<{
    [key: string]: number;
  }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ [key: string]: string }>(
    {}
  );
  const [username, setUsername] = useState("");
  const [taskEdits, setTaskEdits] = useState<{
    [taskId: string]: {
      endDate: string;
      startDate: string;
      title: string;
      hours: number;
      minutes: number;
      seconds: number;
      assignedUser?: string;
    };
  }>({});
  const [projectError, setProjectError] = useState<{
    name?: string;
    description?: string;
  }>({});
  const [taskErrors, setTaskErrors] = useState<{ [projectId: string]: string }>(
    {}
  );
  const projectRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [id, setId] = useState<string>("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskStartDate, setNewTaskStartDate] = useState<{ [key: string]: string }>({});
  const [newTaskEndDate, setNewTaskEndDate] = useState<{ [key: string]: string }>({});
  const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
  const todayDate = () => new Date().toISOString().split("T")[0];
  const navigate = useNavigate();
 const handleStatusChange = async (taskId: string, newStatus: string) => {
  try {
    const updatedTask = await updateTaskStatus(taskId, newStatus); 

    setProjects((prevProjects) =>
      prevProjects.map((project) => ({
        ...project,
        tasks: project.tasks?.map((task) =>
          task.id === taskId ? { ...task, status: updatedTask.status } : task
        ),
      }))
    );
  } catch (err) {
    console.error(err);
    toast.error("Failed to update status");
  }
};

useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const parsed = jwtDecode<User>(token);
      setId(parsed.id || "");
      setUsername(parsed.username || "");
    }
  }, []);
const formatDate = (val: any) => {
  if (!val) return "";
  // handle case where val is already ISO string like "2025-10-03"
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const n = Number(val);
  if (isNaN(n)) return "";
  return new Date(n).toISOString().split("T")[0];
};


  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const u = await getUsers();
    setUsers(u);
  };

  const fetchProjects = async () => {
    const projectsData = await getProjects();
    const projectsWithTasks = await Promise.all(
      projectsData.map(async (project: { id: string }) => {
        const tasks = await getTasksByProject(project.id);
        return { ...project, tasks };
      })
    );
    setProjects(projectsWithTasks);
  };

  const toggleExpandProject = (id: string) => {
    setExpandedProject((prev) => (prev === id ? null : id));
  };

  const handleCreateProject = async () => {
    const errors: { name?: string; description?: string } = {};
    if (!newProjectName.trim()) errors.name = "Project Name is required";
    if (!newProjectDescription.trim())
      errors.description = "Project Description is required";
    if (Object.keys(errors).length > 0) {
      setProjectError(errors);
      return;
    }
    setProjectError({});
    const project = await createProject(newProjectName, newProjectDescription);
    setProjects((prev) => [...prev, { ...project, tasks: [] }]);
    setNewProjectName("");
    setNewProjectDescription("");

    toast.success("Project Created successfully...");
  };

  const handleAddTask = async (projectId: string) => {
    const title = newTaskTitle[projectId] || "";
    const hours = newTaskHours[projectId] || 0;
    const minutes = newTaskMinutes[projectId] || 0;
    const seconds = newTaskSeconds[projectId] || 0;
    const estimatedTime = hours * 3600 + minutes * 60 + seconds;
    const assignedUserId = selectedUser[projectId] || undefined;
    const startDate = newTaskStartDate[projectId] || todayDate();
    const endDate = newTaskEndDate[projectId] || startDate;
    let error = "";
    if (!title.trim()) {
      error = "Task Name is required";
    } else if (hours + minutes + seconds === 0) {
      error = "Please enter at least one value for Hours, Minutes, or Seconds";
    } else if (!assignedUserId) {
      error = "Please assign a user";
    }else if (!startDate || !endDate) {
    error = "Start date is required";
  }

    if (error) {
      setTaskErrors((prev) => ({ ...prev, [projectId]: error }));
      return;
    }

    setTaskErrors((prev) => ({ ...prev, [projectId]: "" }));

    const task = await createTaskAdmin(
      projectId,
      title,
      estimatedTime,
      assignedUserId,
      startDate,
      endDate
    );

    const newTask = {
  ...task,
  savedTime: task.estimatedTime || 0, 
};

setProjects((prev) =>
  prev.map((p) =>
    p.id === projectId
      ? { ...p, tasks: [...(p.tasks || []), newTask] }
      : p
  )
);


    setTaskEdits((prev) => ({
      ...prev,
      [task.id]: {
        title: task.title,
        hours,
        minutes,
        seconds,
        assignedUser: task.assignedUser?.id || assignedUserId || "",
      },
    }));
    toast.success(
      `Task Created and assigned to ${task?.assignedUser?.username}`
    );
    // Reset form
    setNewTaskTitle((prev) => ({ ...prev, [projectId]: "" }));
    setNewTaskHours((prev) => ({ ...prev, [projectId]: 0 }));
    setNewTaskMinutes((prev) => ({ ...prev, [projectId]: 0 }));
    setNewTaskSeconds((prev) => ({ ...prev, [projectId]: 0 }));
    setSelectedUser((prev) => ({ ...prev, [projectId]: "" }));
  };

const handleUpdateTask = async (taskId: string, projectId: string) => {
  const edit = taskEdits[taskId];

  // Validation
  if (!edit.startDate) {
    toast.error("Start date is required");
    return;
  }
  if (!edit.endDate) {
    toast.error("End date is required");
    return;
  }
  if (new Date(edit.endDate) < new Date(edit.startDate)) {
    toast.error("End date cannot be before start date");
    return;
  }

  const estimatedTime = edit.hours * 3600 + edit.minutes * 60 + edit.seconds;

  const updated = await updateTaskAdmin(
    taskId,
    edit.title,
    estimatedTime,
    edit.assignedUser,
    edit.startDate,
    edit.endDate
  );

  toast.success(`Task ${updated.title} updated successfully...`);

  setProjects((prev) =>
    prev.map((p) =>
      p.id === projectId
        ? {
            ...p,
            tasks: p.tasks?.map((t) =>
              t.id === taskId ? { ...t, ...updated } : t
            ),
          }
        : p
    )
  );

  setEditingTaskId(null);

  setTaskEdits((prev) => ({
    ...prev,
    [taskId]: {
      title: updated.title,
      hours: Math.floor((updated.estimatedTime || 0) / 3600),
      minutes: Math.floor(((updated.estimatedTime || 0) % 3600) / 60),
      seconds: (updated.estimatedTime || 0) % 60,
      assignedUser: updated.assignedUser?.id || "",
      startDate: updated.startDate,
      endDate: updated.endDate,
    },
  }));
};


  const handleDeleteTask = async (taskId: string, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    const task = project?.tasks?.find((t) => t.id === taskId);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the task "${task?.title}"...?`
    );

    if (!confirmDelete) return;
    await deleteTask(taskId);
    toast.success("Task deleted successfully...");
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks?.filter((t) => t.id !== taskId) }
          : p
      )
    );
  };
 const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await changePassword(id, oldPassword, newPassword);
      toast.success("Password changed successfully");
      setOldPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      console.error("Change password error:", err);
      const errorMessage =
      err?.networkError?.result?.errors?.[0]?.message ||
      err?.graphQLErrors?.[0]?.message ||
      err?.message ||
      "Failed to change password";

    toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteProject = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the project "${project?.name}"..? 
This will also delete all its tasks.`
    );

    if (!confirmDelete) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully...");

    if (expandedProject === id) setExpandedProject(null);
  };
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

  return (
    <div className="container mt-4">
      {/* <AutoScreenshot/> */}
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Welcome Admin: {username}</h2>
        <div className="d-flex ms-auto">
          <button
            className="btn btn-sm btn-success me-2"
            onClick={() =>
              window.open(`/alluser-timesheet-report`, "_blank")
            }
          >
            View All User Timesheet
          </button>
          <button
          className="btn me-2"
          style={{background:"violet",color:"white"}}
          onClick={() => {
           window.open(`/screenshots`, "_blank")
          }}
        >
          View ScreenShot
        </button>
          <button
          className="btn btn-sm btn-warning me-2"
          onClick={() => setShowPasswordForm(true)}
        >
          Change Password
        </button>
        <button
          className="btn btn-primary me-2"
          onClick={() => {
           window.open(`/userView`, "_blank")
          }}
        >
          Users
        </button>
        <button
          className="btn btn-danger"
          onClick={() => {
            logout();
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

      {/* Create Project */}
      <div className="mb-2">
        <input
          type="text"
          placeholder="Project Name"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="form-control"
        />
        {projectError.name && (
          <div className="text-danger small">{projectError.name}</div>
        )}
        <input
          type="text"
          placeholder="Project Description"
          value={newProjectDescription}
          onChange={(e) => setNewProjectDescription(e.target.value)}
          className="form-control mt-2"
        />
        {projectError.description && (
          <div className="text-danger small">{projectError.description}</div>
        )}
        <button className="btn btn-primary mt-2 " onClick={handleCreateProject}>
          Create Project
        </button>
      </div>
      <div className="mb-4 d-flex justify-content-start align-items-center">
        <h3 className="mb-0">Filter By Project Name:</h3>
        <select
          className="form-select w-25 ms-3"
          value={expandedProject || ""}
          onChange={(e) => {
            setExpandedProject(e.target.value);
            setTimeout(() => {
              const el = projectRefs.current[e.target.value];
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            }, 100);
          }}
        >
          <option value="">Select Project</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Projects */}
      {projects.map((project) => (
        <div className="card mb-3">
          <div className="card-header d-flex justify-content-between align-items-center"
    onClick={() => toggleExpandProject(project.id)}
          >
  <div
    key={project.id}
    ref={(el) => {
      projectRefs.current[project.id] = el;
    }}
  >
    <strong>{project.name}</strong>
    {project.description && (
      <p className="mb-0">{project.description}</p>
    )}
  </div>

  <div className="d-flex align-items-center">
    {project.tasks && project.tasks.length > 0 && (
      <button
        className="btn btn-sm btn-success me-2"
        onClick={() => window.open(`/timesheet-report/${project.id}`, "_blank")}
      >
        View Timesheet
      </button>
    )}
    {project.tasks && project.tasks.length > 0 && (
      <button
        className="btn btn-sm btn-warning me-2"
        onClick={() => window.open(`/project-report/${project.id}`, "_blank")}
      >
        View Report
      </button>
    )}

    <button
      className="btn btn-sm btn-info me-2"
      onClick={(e) =>{
        e.stopPropagation();
        toggleExpandProject(project.id)}}
    >
      {(project as any).tasks.length > 0
    ? expandedProject === project.id
      ? "Collapse"
      : "View Tasks"
    : expandedProject === project.id
      ? "Collapse"
      : "Add Task"}
    </button>

    <button className="btn btn-sm btn-danger" onClick={()=>handleDeleteProject(project.id)}>Delete</button>
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
                    onChange={(e) =>
                      setNewTaskTitle((prev) => ({
                        ...prev,
                        [project.id]: e.target.value,
                      }))
                    }
                  />
                </div>
                   <div className="d-flex flex-column">
    <label>Start Date</label>
    <input
      type="date"
      className="form-control"
      value={newTaskStartDate[project.id] || todayDate()}
      onChange={e => {
        const startDate = e.target.value;
        setNewTaskStartDate(prev => ({ ...prev, [project.id]: startDate }));
        // Adjust end date if it’s before start date
        if (newTaskEndDate[project.id] && newTaskEndDate[project.id] < startDate) {
          setNewTaskEndDate(prev => ({ ...prev, [project.id]: startDate }));
        }
      }}
    />
  </div>
  <div className="d-flex flex-column">
    <label>End Date</label>
    <input
      type="date"
      className="form-control"
      // disabled={(newTaskHours[project.id] || 0) < 9}
      value={newTaskEndDate[project.id] || newTaskStartDate[project.id] || todayDate()}
      min={newTaskStartDate[project.id] || todayDate()}
      onChange={e => setNewTaskEndDate(prev => ({ ...prev, [project.id]: e.target.value }))}
    />
  </div>
                <div className="d-flex flex-column">
                  <label>Hours</label>
                  <input
                    type="number"
                    className="form-control"
                    value={newTaskHours[project.id] || 0}
                    style={{width:"80px"}}
                    onChange={(e) =>
                      setNewTaskHours((prev) => ({
                        ...prev,
                        [project.id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Minutes</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{width:"80px"}}

                    value={newTaskMinutes[project.id] || 0}
                    onChange={(e) =>
                      setNewTaskMinutes((prev) => ({
                        ...prev,
                        [project.id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="d-flex flex-column">
                  <label>Seconds</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{width:"80px"}}
                    value={newTaskSeconds[project.id] || 0}
                    onChange={(e) =>
                      setNewTaskSeconds((prev) => ({
                        ...prev,
                        [project.id]: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="d-flex flex-column">
                  <label>Assign User</label>
                  <select
                    className="form-select"
                    value={selectedUser[project.id] || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev,
                        [project.id]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select User</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.username}
                      </option>
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
                {taskErrors[project.id] && (
                  <div className="w-100 text-danger small">
                    {taskErrors[project.id]}
                  </div>
                )}
              </div>

              {/* Task Table */}
              {project.tasks && project.tasks.length > 0 && (
                <div style={{ overflowX: "auto" }}>
  <table
    className="table table-bordered mt-3 align-middle"
    style={{
      tableLayout: "fixed",
      width: "100%",
      wordWrap: "break-word",
    }}
  >
    <thead className="table-light">
      <tr>
        <th style={{ width: "15%" }}>Task Name</th>
        <th style={{ width: "6%" }}>HH</th>
        <th style={{ width: "6%" }}>MM</th>
        <th style={{ width: "6%" }}>SS</th>
        <th style={{ width: "12%" }}>Time Consume</th>
        <th style={{ width: "12%" }}>Saved Time</th>
        <th style={{ width: "12%" }}>Overtime</th>
        <th style={{ width: "12%" }}>Start Date</th>
        <th style={{ width: "12%" }}>End Date</th>
        <th style={{ width: "10%" }}>Assigned User</th>
        <th style={{ width: "14%" }}>Status</th>
        <th style={{ width: "12%" }}>Actions</th>
      </tr>
    </thead>

    <tbody>
      {project.tasks.map((task) => {
        const isEditing = editingTaskId === task.id;
        const edit = taskEdits[task.id] || {
          title: task.title,
          hours: Math.floor((task.estimatedTime || 0) / 3600),
          minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
          seconds: (task.estimatedTime || 0) % 60,
          assignedUser:
            task.assignedUser?.id || task.assignedUserId || "",
        };

        return (
          <tr key={task.id}>
            {/* Task Name */}
            <td
              style={{
                whiteSpace: "normal",
                wordBreak: "break-word",
                verticalAlign: "middle",
              }}
            >
              {isEditing ? (
                <input
                  type="text"
                  className="form-control"
                  value={edit.title}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: { ...edit, title: e.target.value },
                    }))
                  }
                />
              ) : (
                task.title
              )}
            </td>

            {/* HH */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              {isEditing ? (
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={edit.hours}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        hours: Number(e.target.value),
                      },
                    }))
                  }
                />
              ) : (
                Math.floor((task.estimatedTime || 0) / 3600)
              )}
            </td>

            {/* MM */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              {isEditing ? (
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={edit.minutes}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        minutes: Number(e.target.value),
                      },
                    }))
                  }
                />
              ) : (
                Math.floor(((task.estimatedTime || 0) % 3600) / 60)
              )}
            </td>

            {/* SS */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              {isEditing ? (
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={edit.seconds}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        seconds: Number(e.target.value),
                      },
                    }))
                  }
                />
              ) : (
                (task.estimatedTime || 0) % 60
              )}
            </td>

            {/* Time Consume */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              <span className="badge bg-info">
                {formatDuration((task as any).totalTime || 0)}
              </span>
            </td>

            {/* Saved Time */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              <span className="badge bg-success">
                {formatDuration((task as any).savedTime || 0)}
              </span>
            </td>

            {/* Overtime */}
            <td style={{ textAlign: "left", verticalAlign: "middle" }}>
              <span className="badge bg-warning text-dark">
                {formatDuration((task as any).overtime || 0)}
              </span>
            </td>

            {/* Start Date */}
            <td style={{ verticalAlign: "middle" }}>
              {isEditing ? (
                <input
                  type="date"
                  className="form-control"
                  value={edit.startDate || ""}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        startDate: e.target.value,
                      },
                    }))
                  }
                />
              ) : task.startDate ? (
                formatDate(task.startDate)
              ) : (
                "-"
              )}
            </td>

            {/* End Date */}
            <td style={{ verticalAlign: "middle" }}>
              {isEditing ? (
                <input
                  type="date"
                  className="form-control"
                  min={edit.startDate || ""}
                  value={edit.endDate || ""}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        endDate: e.target.value,
                      },
                    }))
                  }
                />
              ) : task.endDate ? (
                formatDate(task.endDate)
              ) : (
                "-"
              )}
            </td>

            {/* Assigned User */}
            <td
              style={{
                whiteSpace: "normal",
                wordBreak: "break-word",
                verticalAlign: "middle",
              }}
            >
              {isEditing ? (
                <select
                  className="form-select"
                  value={edit.assignedUser || ""}
                  onChange={(e) =>
                    setTaskEdits((prev) => ({
                      ...prev,
                      [task.id]: {
                        ...edit,
                        assignedUser: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Select User</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              ) : (
                task.assignedUser?.username || "Unassigned"
              )}
            </td>
<td>
  {isEditing ? (
    <select
      value={task.status}
      onChange={(e) => handleStatusChange(task.id, e.target.value)}
      className="form-select"
    >
      {Object.entries(statusMap).map(([key, { label }]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </select>
  ) : (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "4px",
        color: "#fff",
        backgroundColor: statusMap[task.status]?.bgColor || "#6c757d",
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {statusMap[task.status]?.label || task.status}
    </span>
  )}
</td>


            {/* Actions */}
            <td style={{ verticalAlign: "middle" }}>
              {isEditing ? (
                <>
                  <button
                    className="btn btn-sm btn-success"
                    style={{ width: "80px" }}
                    onClick={() => {
                      handleUpdateTask(task.id, project.id);
                      setEditingTaskId(null);
                    }}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-sm btn-secondary mt-2"
                    style={{ width: "80px" }}
                    onClick={() => setEditingTaskId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="btn btn-sm btn-primary me-2"
                    style={{ width: "80px" }}
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setTaskEdits((prev) => ({
                        ...prev,
                        [task.id]: {
                          title: task.title,
                          hours: Math.floor(
                            (task.estimatedTime || 0) / 3600
                          ),
                          minutes: Math.floor(
                            ((task.estimatedTime || 0) % 3600) / 60
                          ),
                          seconds: (task.estimatedTime || 0) % 60,
                          assignedUser:
                            task.assignedUser?.id ||
                            task.assignedUserId ||
                            "",
                          startDate: formatDate(task.startDate),
                          endDate: formatDate(task.endDate),
                        },
                      }));
                    }}
                  >
                    Update
                  </button>
                  <button
                    className="btn btn-sm btn-danger mt-1"
                    style={{ width: "80px" }}
                    onClick={() => handleDeleteTask(task.id, project.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
