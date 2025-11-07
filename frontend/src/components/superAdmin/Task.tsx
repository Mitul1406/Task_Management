"use client";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getProjects,
  getUsers,
  getTasksByProject,
  createTaskAdmin,
  updateTaskAdmin,
  deleteTask,
  updateTaskStatus,
} from "../../services/api";
import { toast } from "react-toastify";
import Pagination from "../Pagination";

const SuperAdminTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromURL = queryParams.get("projectId");

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(projectIdFromURL || "all");
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10; 
  const [totalPages, setTotalPages] = useState(1);
  const [projectName,setProjectName]=useState("")
  const today = () => new Date().toISOString().split("T")[0];

  const [taskForm, setTaskForm] = useState({
    title: "",
    projectId: "",
    assignedUserId: "",
    startDate: today(),
    endDate: today(),
    status: "pending",
    estimatedHours: 0,
    estimatedMinutes: 0,
    estimatedSeconds: 0,
  });

  const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};
   const handleStatusChange = async (taskId: string, newStatus: string) => {
      try {
        const updatedTask = await updateTaskStatus(taskId, newStatus); 
        
        setTasks((prevTasks) =>
        prevTasks.map((t:any) => (t.id === taskId ? { ...t,status:updatedTask.status } : t))
      );
      } catch (err) {
        console.error(err);
        toast.error("Failed to update status");
      }
    };
  // Fetch base data
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (projects.length > 0) {
      if (selectedProject === "all") fetchAllTasks();
      else fetchTasksByProject(selectedProject);
    }
  }, [selectedProject, projects,currentPage]);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res);
    } catch {
      toast.error("Failed to load projects");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res);
    } catch {
      toast.error("Failed to load users");
    }
  };

 const fetchAllTasks = async () => {
  try {
    setLoading(true);
    const all = await Promise.all(
      projects.map(async (proj) => {
        const tasks = await getTasksByProject(proj.id);
        return tasks.map((t: any) => ({ ...t, projectName: proj.name }));
      })
    );
    const combined = all.flat();
    setTotalPages(Math.ceil(combined.length / tasksPerPage));
    const start = (currentPage - 1) * tasksPerPage;
    const paginated = combined.slice(start, start + tasksPerPage);
    setTasks(paginated);
  } catch {
    toast.error("Failed to fetch tasks");
  } finally {
    setLoading(false);
  }
};

const fetchTasksByProject = async (id: string) => {
  try {
    setLoading(true);
    const res = await getTasksByProject(id);
    setTotalPages(Math.ceil(res.length / tasksPerPage));
    const start = (currentPage - 1) * tasksPerPage;
    const paginated = res.slice(start, start + tasksPerPage);
    setTasks(paginated);
    const data:any=projects.filter(p=>p.id === id)
    setProjectName(data[0].name)
  } catch {
    toast.error("Failed to fetch project tasks");
  } finally {
    setLoading(false);
  }
};

  const handleProjectFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedProject(val);
    const name=projects.filter(p=>p.id===val)
    
    if (val === "all") navigate("/tasks");
    else
      { navigate(`/tasks?projectId=${val}`); 
    setProjectName(name[0].name)}
  };

  const handleAddTask = () => {
    setEditMode(false);
    setCurrentTaskId("");
    setTaskForm({
      title: "",
      projectId: selectedProject === "all" ? "" : selectedProject,
      assignedUserId: "",
      startDate: today(),
      endDate: today(),
      status: "pending",
      estimatedHours: 0,
      estimatedMinutes: 0,
      estimatedSeconds: 0,
    });
    setShowModal(true);
  };

  const handleEditTask = (task: any) => {
    const totalSeconds = task.estimatedTime || 0;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let proId: any;

  if (selectedProject === "all" ) {
    
    proId = projects.filter((p) => p.name === task.projectName);
  } else {
    proId = projects.filter((p) => p.id === selectedProject);
  }

  console.log("Selected Project:", proId);
  console.log("Task details:", task);
    
    setEditMode(true);
    setCurrentTaskId(task.id);
    setProjectName(proId[0].name)
    setTaskForm({
      title: task.title,
      projectId: proId[0]?.id || task.project?._id || task.projectId || "",
      assignedUserId: task.assignedUser?.id || "",
      startDate: task.startDate?.split("T")[0] || today(),
      endDate: task.endDate?.split("T")[0] || today(),
      status: task.status || "pending",
      estimatedHours: hours,
      estimatedMinutes: minutes,
      estimatedSeconds: seconds,
    });
    setShowModal(true);
  };

  const handleSaveTask = async () => {
    try {
      if (!taskForm.title || !taskForm.projectId) {
        toast.warning("Please enter title and select project");
        return;
      }

      const estimatedTime =
        taskForm.estimatedHours * 3600 +
        taskForm.estimatedMinutes * 60 +
        taskForm.estimatedSeconds;

      if (editMode && currentTaskId) {
        await updateTaskAdmin(
          currentTaskId,
          taskForm.title,
          estimatedTime,
          taskForm.assignedUserId,
          taskForm.startDate,
          taskForm.endDate,
          taskForm.status
        );
        toast.success("Task updated successfully");
      } else {
        await createTaskAdmin(
          taskForm.projectId,
          taskForm.title,
          estimatedTime,
          taskForm.assignedUserId,
          taskForm.startDate,
          taskForm.endDate
        );
        toast.success("Task added successfully");
      }

      setShowModal(false);
      if (selectedProject === "all") fetchAllTasks();
      else fetchTasksByProject(selectedProject);
    } catch {
      toast.error("Error saving task");
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm("Are you sure to delete this task?")) return;
    try {
      await deleteTask(id);
      toast.success("Task deleted");
      if (selectedProject === "all") fetchAllTasks();
      else fetchTasksByProject(selectedProject);
    } catch {
      toast.error("Failed to delete task");
    }
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
          <h3>Tasks</h3>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <label className="fw-bold">Filter By Project:</label>
          <select
            className="form-select w-100 mt-2"
            value={selectedProject}
            onChange={handleProjectFilter}
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary mt-4" onClick={handleAddTask}>
          + Add Task
        </button>
      </div>

     <div
  className="table-responsive card p-4"
  style={{
    width: "100%",
    overflowX: "auto",
    whiteSpace: "nowrap",
  }}
>
  <table
    className="table table-hover align-middle"
  >
    <thead>
      <tr>
        <th>Title</th>
        <th>Project</th>
        <th>Assigned To</th>
        <th>Start</th>
        <th>End</th>
        <th>Est. Time</th>
        <th>Consumed</th>
        <th>Saved</th>
        <th>Overtime</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {tasks.length === 0 ? (
    <tr>
      <td colSpan={11} className="text-center text-muted py-3">
        No tasks found.
      </td>
    </tr>
  ):(tasks.map((task) => (
        <tr key={task.id}>
          <td>{task.title}</td>
          <td>{task.projectName || projectName || "-"}</td>
          <td>{task.assignedUser?.username || "Unassigned"}</td>
          <td>{task.startDate?.split("T")[0]}</td>
          <td>{task.endDate?.split("T")[0]}</td>
          <td>{formatDuration(task.estimatedTime)}</td>
          <td>{formatDuration(task.totalTime)}</td>
          <td>{formatDuration(task.savedTime)}</td>
          <td>{formatDuration(task.overtime)}</td>
          <td>
            <span
              className="badge"
              style={{
                backgroundColor:
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
                className="btn btn-sm btn-outline-primary"
                onClick={() => handleEditTask(task)}
              >
                Edit
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                onClick={() => handleDeleteTask(task.id)}
              >
                Delete
              </button>
            </div>
          </td>
        </tr>
      )))}
    </tbody>
  </table>
    <Pagination
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={totalPages}
    />
</div>


      {showModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
    style={{
      background: "rgba(0,0,0,0.5)",
      zIndex: 1050,
      overflowY: "auto",
    }}
  >
    <div
      className="bg-white p-4 rounded shadow"
      style={{ width: "90%", maxWidth: "700px" }}
    >
      <h5 className="mb-3 text-center text-primary">
        {editMode ? (
          <>
            Edit Task — <span className="text-dark">{taskForm.title}</span>
          </>
        ) : (
          "Add New Task"
        )}
      </h5>

      <div className="d-flex flex-column gap-3">
        {/* Project */}
        <div>
          <label>Project</label>
          <select
            className="form-select"
            value={taskForm.projectId}
            onChange={(e) =>
              setTaskForm({ ...taskForm, projectId: e.target.value })
            }
          >
            <option value="">Select Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Task Name */}
        <div>
          <label>Task Name</label>
          <input
            type="text"
            className="form-control"
            value={taskForm.title}
            onChange={(e) =>
              setTaskForm({ ...taskForm, title: e.target.value })
            }
          />
        </div>

        {/* Dates */}
        <div className="row g-3">
          <div className="col-md-6">
            <label>Start Date</label>
            <input
              type="date"
              className="form-control"
              value={taskForm.startDate}
              onChange={(e) =>
                setTaskForm({ ...taskForm, startDate: e.target.value })
              }
            />
          </div>
          <div className="col-md-6">
            <label>End Date</label>
            <input
              type="date"
              className="form-control"
              min={taskForm.startDate || ""}
              value={taskForm.endDate}
              onChange={(e) =>
                setTaskForm({ ...taskForm, endDate: e.target.value })
              }
            />
          </div>
        </div>

        {/* Estimated Time */}
        <div>
          <label>Estimated Time</label>
          <div className="row g-3">
            <div className="col-md-4">
              <input
                type="number"
                className="form-control"
                placeholder="Hours"
                min={0}
                value={taskForm.estimatedHours}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    estimatedHours: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-md-4">
              <input
                type="number"
                className="form-control"
                placeholder="Minutes"
                min={0}
                value={taskForm.estimatedMinutes}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    estimatedMinutes: Number(e.target.value),
                  })
                }
              />
            </div>
            <div className="col-md-4">
              <input
                type="number"
                className="form-control"
                placeholder="Seconds"
                min={0}
                value={taskForm.estimatedSeconds}
                onChange={(e) =>
                  setTaskForm({
                    ...taskForm,
                    estimatedSeconds: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* Assign User + Status (inline change ready) */}
        <div className="row g-3">
          <div className="col-md-6">
            <label>Assign User</label>
            <select
              className="form-select"
              value={taskForm.assignedUserId}
              onChange={(e) =>
                setTaskForm({ ...taskForm, assignedUserId: e.target.value })
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

          <div className="col-md-6">
            <label>Status</label>
            <select
              className="form-select"
              value={taskForm.status}
              onChange={(e) => {
                const newStatus = e.target.value;
                setTaskForm({ ...taskForm, status: newStatus });
                handleStatusChange(currentTaskId,e.target.value)
              }}
            >
              {Object.entries(statusMap).map(([key, {label}]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        <button
          className="btn btn-secondary"
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
        <button className="btn btn-success" onClick={handleSaveTask}>
          {editMode ? "Save Changes" : "Add Task"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default SuperAdminTask;
