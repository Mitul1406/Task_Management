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
import { InputActionMeta } from "react-select";
import Select from "react-select";
import Swal from "sweetalert2";

const SuperAdminTask: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromURL = queryParams.get("projectId");
  const status:any = queryParams.get("status");

  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  
  const [selectedProject, setSelectedProject] = useState(
  projectIdFromURL ? [projectIdFromURL] : ["all"]
);

  const [loading, setLoading] = useState(false);
  const [filteredCount, setFilteredCount] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10; 
  const [totalPages, setTotalPages] = useState(1);
  const [projectName,setProjectName]=useState("")
  const today = () => new Date().toISOString().split("T")[0];
  const [selectedStatus, setSelectedStatus] = useState(["all"]);
  const [selectedUser, setSelectedUser] = useState(["all"]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "code_review", label: "Code Review" },
  { value: "done", label: "Done" },
];

const projectOptions = [
  { value: "all", label: "All Projects" },
  ...projects.map((p) => ({ value: p.id, label: p.name })),
];

const userOptions = [
  { value: "all", label: "All Users" },
  ...users.map((u) => ({ value: u.id, label: u.username })),
];

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
    maxHeight: "35px", 
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

const selectedProjectOptions = selectedProject.includes("all")
  ? [projectOptions[0]]
  : projectOptions.filter((opt) => selectedProject.includes(opt.value));

const selectedUserOptions = selectedUser.includes("all")
  ? [userOptions[0]]
  : userOptions.filter((opt) => selectedUser.includes(opt.value));

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
    useEffect(()=>{
       if(status)
       {
        setSelectedStatus(status)
       }
    },[status])
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  },[]);

useEffect(() => {
  if (projects.length > 0) {
    if (selectedProject.includes("all") || selectedProject.length !== 1) {
      fetchAllTasks();
    } else {
      fetchTasksByProject(selectedProject[0]);
    }
  }
}, [selectedProject, projects, currentPage]);

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
      console.log(users)
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
        return tasks.map((t: any) => ({ ...t, projectName: proj.name,projectId: proj.id }));
      })
    );
    const combined = all.flat();
    setTasks(combined); // store all
  } catch {
    toast.error("Failed to fetch tasks");
  } finally {
    setLoading(false);
  }
};


const fetchTasksByProject = async (id: string) => {
  if (!id || id === "all") {
    await fetchAllTasks();
    return;
  }

  try {
    setLoading(true);
    const res = await getTasksByProject(id);
    const project = projects.find((p) => p.id === id);

    const tasksWithProjectName = res.map((t: any) => ({
      ...t,
      projectName: project?.name || "-",
      projectId: id,
    }));

    setProjectName(project?.name || "-");
    setTasks(tasksWithProjectName);
  } catch (err) {
    console.error("Error fetching project tasks:", err);
    toast.error("Failed to fetch project tasks");
  } finally {
    setLoading(false);
  }
};


  const handleAddTask = () => {
    setEditMode(false);
    setCurrentTaskId("");
    const projectId =
    selectedProject.includes("all") || selectedProject.length !== 1
      ? ""
      : selectedProject[0];
    setTaskForm({
      title: "",
      projectId,
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

  if (selectedProject.includes("all") || selectedProject.length !== 1) {
    proId = projects.find((p) => p.name === task.projectName);
  } else {
    proId = projects.find((p) => p.id === selectedProject[0]);
  }

    
    setEditMode(true);
    setCurrentTaskId(task.id);
    setProjectName(proId[0].name)
    setTaskForm({
      title: task.title,
      projectId: proId?.id || task.project?._id || task.projectId || "",
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
  const newErrors = {
    projectId: "",
    title: "",
    estimatedTime: "",
    assignedUserId: "",
    startDate: "",
    endDate: "",
  };

  if (!taskForm.projectId) newErrors.projectId = "Please select a project.";
  if (!taskForm.title.trim()) newErrors.title = "Task name is required.";
  if (!taskForm.assignedUserId)
    newErrors.assignedUserId = "Please select a user.";

  const { estimatedHours, estimatedMinutes, estimatedSeconds } = taskForm;
  const totalSeconds =
    (Number(estimatedHours) || 0) * 3600 +
    (Number(estimatedMinutes) || 0) * 60 +
    (Number(estimatedSeconds) || 0);
  if (totalSeconds <= 0)
    newErrors.estimatedTime = "Enter at least one non-zero time value.";

  if (taskForm.startDate && taskForm.endDate) {
    if (new Date(taskForm.endDate) < new Date(taskForm.startDate))
      newErrors.endDate = "End date cannot be before start date.";
  }

  if (Object.values(newErrors).some((msg) => msg)) {
    setErrors(newErrors);
    return;
  }

  setErrors({
    projectId: "",
    title: "",
    estimatedTime: "",
    assignedUserId: "",
    startDate: "",
    endDate: "",
  });

  try {
    const estimatedTime = totalSeconds;

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
    if (selectedProject.includes("all") || selectedProject.length !== 1) {
      await fetchAllTasks();
    } else {
      await fetchTasksByProject(selectedProject[0]);
    }
  } catch {
    toast.error("Error saving task");
  }
};
const handleDeleteTask = async (id: string) => {
  const result = await Swal.fire({
    title: "Are you sure?",
    text: "This action will permanently delete the task.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });

  if (!result.isConfirmed) return;

  try {
    await deleteTask(id);
    toast.success("Task deleted successfully");

    if (selectedProject.includes("all") || selectedProject.length !== 1) {
      await fetchAllTasks();
    } else {
      await fetchTasksByProject(selectedProject[0]);
    }
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

useEffect(() => {
  if (!tasks || tasks.length === 0) {
    setFilteredTasks([]);
    setTotalPages(1);
    return;
  }

  let filtered = [...tasks];
  if (!selectedProject.includes("all") && selectedProject.length > 0) {
  filtered = filtered.filter((t) => selectedProject.includes(t.projectId));
}

  if (!selectedStatus.includes("all") && selectedStatus.length > 0) {
    filtered = filtered.filter((task) => selectedStatus.includes(task.status));
  }

  if (!selectedUser.includes("all") && selectedUser.length > 0) {
    filtered = filtered.filter(
      (t) => selectedUser.includes(t.assignedUser?.id || t.assignedUserId || "")
    );
  }

  if (startDate) {
    filtered = filtered.filter(
      (t) => t.startDate && new Date(t.startDate) >= new Date(startDate)
    );
  }

  if (endDate) {
    filtered = filtered.filter(
      (t) => t.endDate && new Date(t.endDate) <= new Date(endDate)
    );
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / tasksPerPage);
  setTotalPages(totalPages);

  const start = (currentPage - 1) * tasksPerPage;
  const paginated = filtered.slice(start, start + tasksPerPage);
  setFilteredCount(filtered.length);
  setFilteredTasks(paginated);
}, [tasks, selectedStatus, selectedUser, selectedProject, startDate, endDate, currentPage]);

useEffect(() => {
  setCurrentPage(1);
}, [selectedStatus, selectedUser, startDate, endDate]);

  return (
    <div className="container-fluid mt-4">
          <h3>Tasks</h3>
      <div className="container-fluid mb-3">
  <div className="row g-3 align-items-end">

    {/* Filter By Project */}
    <div className="col-12 col-md-4 col-lg-2">
      <label className="fw-bold mb-1">Filter By Project:</label>
      <Select
        isMulti
        options={projectOptions}
        value={selectedProjectOptions}
        onChange={(selected: any) => {
          const values = selected ? selected.map((s: any) => s.value) : [];
          setSelectedProject(values.includes("all") ? ["all"] : values);
        }}
        placeholder="Select Projects..."
        styles={selectStyles}
      />
    </div>

    {/* Filter By Status */}
    <div className="col-12 col-md-4 col-lg-2">
      <label className="fw-bold mb-1">Filter By Status:</label>
      <Select
        isMulti
        options={statusOptions}
        value={statusOptions.filter((opt) =>
          selectedStatus.includes(opt.value)
        )}
        onChange={(selected) => {
          const values = selected ? selected.map((s) => s.value) : [];
          setSelectedStatus(values.includes("all") ? ["all"] : values);
        }}
        placeholder="Select Status..."
        styles={selectStyles}
      />
    </div>

    {/* Filter By User */}
    <div className="col-12 col-md-4 col-lg-2">
      <label className="fw-bold mb-1">Filter By Assigned User:</label>
      <Select
        isMulti
        options={userOptions}
        value={selectedUserOptions}
        onChange={(selected: any) => {
          const values = selected ? selected.map((s: any) => s.value) : [];
          setSelectedUser(values.includes("all") ? ["all"] : values);
        }}
        placeholder="Select Users..."
        styles={selectStyles}
      />
    </div>

    {/* Start Date */}
    <div className="col-6 col-md-3 col-lg-2">
      <label className="fw-bold mb-1">Start Date:</label>
      <input
        type="date"
        className="form-control"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </div>

    {/* End Date */}
    <div className="col-6 col-md-3 col-lg-2">
      <label className="fw-bold mb-1">End Date:</label>
      <input
        type="date"
        className="form-control"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </div>

    {/* Add Task Button */}
    <div className="col-12 col-md-3 col-lg-2 text-md-end">
      <button className="btn btn-primary w-100 mt-2 mt-md-0" onClick={handleAddTask}>
        + Add Task
      </button>
    </div>

  </div>
</div>

  <div
  className="table-responsive card p-4 shadow-sm border-0 bg-light"
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
        <th style={{minWidth:"300px"}}>Title</th>
        <th>Project</th>
        <th>Assigned To</th>
        <th>Start</th>
        <th>End</th>
        <th>Estimated</th>
        <th>Consumed</th>
        <th>Saved</th>
        <th>Time Extension</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {filteredTasks.length === 0 ? (
    <tr>
      <td colSpan={11} className="text-center text-muted py-3">
        No tasks found.
      </td>
    </tr>
  ):(filteredTasks.map((task) => (
        <tr key={task.id}>
          <td className="text-wrap text-break">{task.title}</td>
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
    
</div>
<Pagination
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={totalPages}
      pageSize={tasksPerPage}
      totalResults={filteredCount}
    />

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
        
<div>
  <label>Project</label>
  <select
  className={`form-select ${errors.projectId ? "is-invalid" : ""}`}
  value={taskForm.projectId}
  onChange={(e) => {
    setTaskForm({ ...taskForm, projectId: e.target.value });
    if (errors.projectId && e.target.value)
      setErrors((prev:any) => ({ ...prev, projectId: "" }));
  }}
>
  <option value="">Select Project</option>
  {projects.map((p) => (
    <option key={p.id} value={p.id}>
      {p.name}
    </option>
  ))}
</select>
{errors.projectId && <small className="text-danger">{errors.projectId}</small>}

</div>

<div>
  <label>Task Name</label>
  <input
  type="text"
  className={`form-control ${errors.title ? "is-invalid" : ""}`}
  value={taskForm.title}
  onChange={(e) => {
    setTaskForm({ ...taskForm, title: e.target.value });
    if (errors.title && e.target.value.trim())
      setErrors((prev:any) => ({ ...prev, title: "" }));
  }}
/>
{errors.title && <small className="text-danger">{errors.title}</small>}

</div>

<div className="row g-3">
  <div className="col-md-6">
    <label>Start Date</label>
    <input
      type="date"
      className={`form-control ${errors.startDate ? "is-invalid" : ""}`}
      value={taskForm.startDate}
      onChange={(e) =>
        setTaskForm({ ...taskForm, startDate: e.target.value })
      }
    />
    {errors.startDate && (
      <small className="text-danger">{errors.startDate}</small>
    )}
  </div>

  <div className="col-md-6">
    <label>End Date</label>
    <input
      type="date"
      className={`form-control ${errors.endDate ? "is-invalid" : ""}`}
      min={taskForm.startDate || ""}
      value={taskForm.endDate}
      onChange={(e) =>
        setTaskForm({ ...taskForm, endDate: e.target.value })
      }
    />
    {errors.endDate && (
      <small className="text-danger">{errors.endDate}</small>
    )}
  </div>
</div>

        <div>
  <label>Estimated Time</label>
  <div className="row g-3">
    <div className="col-md-4">
      <input
        type="number"
        className={`form-control ${
          errors.estimatedTime ? "is-invalid" : ""
        }`}
        placeholder="Hours"
        min={0}
        value={taskForm.estimatedHours}
        onChange={(e) => {
          const value = Number(e.target.value);
          const updatedForm = { ...taskForm, estimatedHours: value };

          const { estimatedHours, estimatedMinutes, estimatedSeconds } = updatedForm;
          if (
            estimatedHours > 0 ||
            estimatedMinutes > 0 ||
            estimatedSeconds > 0
          ) {
            setErrors((prev: any) => ({ ...prev, estimatedTime: "" }));
          }

          setTaskForm(updatedForm);
        }}
      />
    </div>

    <div className="col-md-4">
      <input
        type="number"
        className={`form-control ${
          errors.estimatedTime ? "is-invalid" : ""
        }`}
        placeholder="Minutes"
        min={0}
        value={taskForm.estimatedMinutes}
        onChange={(e) => {
          const value = Number(e.target.value);
          const updatedForm = { ...taskForm, estimatedMinutes: value };

          const { estimatedHours, estimatedMinutes, estimatedSeconds } = updatedForm;
          if (
            estimatedHours > 0 ||
            estimatedMinutes > 0 ||
            estimatedSeconds > 0
          ) {
            setErrors((prev: any) => ({ ...prev, estimatedTime: "" }));
          }

          setTaskForm(updatedForm);
        }}
      />
    </div>

    <div className="col-md-4">
      <input
        type="number"
        className={`form-control ${
          errors.estimatedTime ? "is-invalid" : ""
        }`}
        placeholder="Seconds"
        min={0}
        value={taskForm.estimatedSeconds}
        onChange={(e) => {
          const value = Number(e.target.value);
          const updatedForm = { ...taskForm, estimatedSeconds: value };

          const { estimatedHours, estimatedMinutes, estimatedSeconds } = updatedForm;
          if (
            estimatedHours > 0 ||
            estimatedMinutes > 0 ||
            estimatedSeconds > 0
          ) {
            setErrors((prev: any) => ({ ...prev, estimatedTime: "" }));
          }

          setTaskForm(updatedForm);
        }}
      />
    </div>
  </div>

  {errors.estimatedTime && (
    <small className="text-danger">{errors.estimatedTime}</small>
  )}
</div>


        <div className="row g-3">
          <div className="col-md-6">
            <label>Assign User</label>
            <select
  className={`form-select ${errors.assignedUserId ? "is-invalid" : ""}`}
  value={taskForm.assignedUserId}
  onChange={(e) => {
    setTaskForm({ ...taskForm, assignedUserId: e.target.value });
    if (errors.assignedUserId && e.target.value)
      setErrors((prev: any) => ({ ...prev, assignedUserId: "" }));
  }}
>
  <option value="">Select User</option>
  {users.map((u) => (
    <option key={u.id} value={u.id}>
      {u.username}
    </option>
  ))}
</select>
{errors.assignedUserId && (
  <small className="text-danger">{errors.assignedUserId}</small>
)}
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
          onClick={() => {
            setErrors({})
            setShowModal(false)}}
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
