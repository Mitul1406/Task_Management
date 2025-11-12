"use client";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getAdminProjects,
  getUsers,
  getTasksByProject,
  createTaskAdmin,
  updateTaskAdmin,
  deleteTask,
  updateTaskStatus,
} from "../../services/api";
import { toast } from "react-toastify";
import Pagination from "../Pagination";
import { jwtDecode } from "jwt-decode";
import { parse } from "path";
import Swal from "sweetalert2";
import Select from "react-select";
import { log } from "console";

const TaskTl: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const projectIdFromURL = queryParams.get("projectId");
  const status = queryParams.get("status");
  const user = queryParams.get("user");
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState(
    projectIdFromURL ? [projectIdFromURL] : ["all"]
  );
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [projectName, setProjectName] = useState("");
  const today = () => new Date().toISOString().split("T")[0];
  const [selectedStatus, setSelectedStatus] = useState(["all"]);
  const [selectedUser, setSelectedUser] = useState(["all"]);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [paginatedTasks, setPaginatedTasks] = useState<any[]>([]);
  const [errors, setErrors] = useState<any>({});
  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "code_review", label: "Code Review" },
    { value: "done", label: "Done" },
  ];
  const userOptions = [
    { value: "all", label: "All Users" },
    ...users.map((u) => ({ value: u.id, label: u.username })),
  ];

  const selectedUserOptions =
    selectedUser.length === 0
      ? []
      : selectedUser.includes("all")
      ? [userOptions.find((opt) => opt.value === "all")!]
      : userOptions.filter((opt) => selectedUser.includes(opt.value));

  const projectOptions = [
    { value: "all", label: "All Projects" },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const selectedProjectOptions = selectedProject.includes("all")
    ? projectOptions.filter(
        (opt) => opt.value === "all" || selectedProject.length > 1
      )
    : projectOptions.filter((opt) => selectedProject.includes(opt.value));

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? "#0d6efd" : "#ced4da",
      borderRadius: "6px",
      boxShadow: state.isFocused
        ? "0 0 0 0.2rem rgba(13, 110, 253, 0.25)"
        : "none",
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
        prevTasks.map((t: any) =>
          t.id === taskId ? { ...t, status: updatedTask.status } : t
        )
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };
  useEffect(() => {
    fetchProjects();
    fetchUsers();
  }, []);
  useEffect(() => {
    if (status) {
      setSelectedStatus([status]);
    }
    if (user) {
      setSelectedUser([user]);
    }
  }, [status, user]);

  useEffect(() => {
    if (selectedProject.length === 0) return;

    if (selectedProject.includes("all") || selectedProject.length > 1) {
      fetchAllTasks();
    } else {
      fetchTasksByProject(selectedProject[0]);
    }
  }, [selectedProject, projects, currentPage]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const parsed = jwtDecode<any>(token);
        setId(parsed.id);
        const res = await getAdminProjects(parsed.id);
        setProjects(res);
      }
    } catch {
      toast.error("Failed to load projects");
    }
  };

  useEffect(() => {
    if (!tasks || tasks.length === 0) {
      setFilteredTasks([]);
      setPaginatedTasks([]);
      setTotalPages(1);
      return;
    }
    console.log(tasks);
    
    let filtered = [...tasks];
    console.log("----------->",filtered);
    console.log("---->",selectedProject);
    
    if (!selectedProject.includes("all") && selectedProject.length > 0) {
    filtered = filtered.filter((t) =>
      selectedProject.includes(t.projectId)
    );
  }
    console.log("----------->000000",filtered);


    if (!selectedStatus.includes("all") && selectedStatus.length > 0) {
      filtered = filtered.filter((task) =>
        selectedStatus.includes(task.status)
      );
    }
    console.log("----------->000001",filtered);
     
    if (!selectedUser.includes("all")) {
  filtered = filtered.filter(
    (t) =>
      (t.assignedUser && selectedUser.includes(t.assignedUser.id)) ||
      (t.assignedUserId && selectedUser.includes(t.assignedUserId))
  );
}

    console.log("----------->000002",filtered);

    if (startDate) {
      filtered = filtered.filter(
        (t) => new Date(t.startDate) >= new Date(startDate)
      );
    }
    console.log("----------->000003",filtered);


    if (endDate) {
      filtered = filtered.filter(
        (t) => new Date(t.endDate) <= new Date(endDate)
      );
    }
    console.log("----------->000004",filtered);


    setFilteredTasks(filtered);
    // setCurrentPage(1);
  }, [selectedStatus, selectedUser,selectedProject, startDate, endDate, tasks]);


  useEffect(() => {
    setCurrentPage(1);
  }, [selectedStatus, selectedUser, startDate, endDate]);

  useEffect(() => {
    const pages = Math.ceil(filteredTasks.length / tasksPerPage);
    setTotalPages(pages || 1);

    const start = (currentPage - 1) * tasksPerPage;
    const paginated = filteredTasks.slice(start, start + tasksPerPage);
    setPaginatedTasks(paginated);
  }, [filteredTasks, currentPage]);

  const fetchUsers = async () => {
    try {
      const res = await getUsers();
      const data = res.filter((u: any) => u.role !== "teamLead");
      const token = localStorage.getItem("token");
      if (token) {
        const parsed = jwtDecode<any>(token);
        data.push(parsed);
      }
      console.log(data);
      setUsers(data);
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
          const filtered = tasks.filter(
            (t: any) =>
              t.assignedUser?.role !== "teamLead" || t.assignedUser?.id === id
          );
          return filtered.map((t: any) => ({ ...t, projectName: proj.name,projectId:proj.id }));
        })
      );

      const combined = all.flat();
      setTasks(combined);
    } catch (err) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksByProject = async (id: string) => {
    
    try {
      setLoading(true);
      const res = await getTasksByProject(id);
      const token: any = localStorage.getItem("token");
      const data: any = jwtDecode(token);
      const filtered = res
      .filter(
        (t: any) =>
          t.assignedUser?.role !== "teamLead" || t.assignedUser?.id === data.id
      )
      .map((t: any) => ({
        ...t,
        projectId: id, // add projectId
        projectName: projects.find((p) => p.id === id)?.name || "", // add projectName
      }));

      setTasks(filtered);

      const projectData: any = projects.find((p) => p.id === id);
      setProjectName(projectData?.name || "");
    } catch {
      toast.error("Failed to fetch project tasks");
    } finally {
      setLoading(false);
    }
  };

  // const handleProjectFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
  //   const val = e.target.value;
  //   setSelectedProject(val);
  //   const name=projects.filter(p=>p.id===val)

  //   if (val === "all") navigate("/taskTls");
  //   else
  //     { navigate(`/taskTls?projectId=${val}`);
  //   setProjectName(name[0].name)}
  // };

  const handleAddTask = () => {
    setEditMode(false);
    setCurrentTaskId("");

    setTaskForm({
      title: "",
      projectId:
        selectedProject.includes("all") || selectedProject.length === 0
          ? ""
          : selectedProject[0],
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

    if (selectedProject.includes("all")) {
      proId = projects.filter((p) => p.name === task.projectName);
    } else {
      proId = projects.filter((p) => selectedProject.includes(p.id));
    }

    setEditMode(true);
    setCurrentTaskId(task.id);
    setProjectName(proId[0].name);
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
    try {
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
      if (selectedProject.includes("all")) {
        fetchAllTasks();
      } else {
        fetchTasksByProject(selectedProject[0]);
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
      toast.success("Task deleted");
      if (selectedProject.includes("all")) {
        fetchAllTasks();
      } else {
        fetchTasksByProject(selectedProject[0]);
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
  return (
    <div className="container mt-4">
      <h3>Tasks</h3>
  <div className="row g-3 align-items-end mb-3">
    {/* Filter By Project */}
    <div className="col-12 col-md-4 col-lg-2">
      <label className="fw-bold mb-1">Filter By Project:</label>
      <Select
        isMulti
        options={projectOptions}
        value={selectedProjectOptions}
        onChange={(selected: any) => {
          let values = selected ? selected.map((s: any) => s.value) : [];
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
        onChange={(selected: any) => {
          const values = selected ? selected.map((s: any) => s.value) : [];
          setSelectedStatus(values.includes("all") ? ["all"] : values);
        }}
        placeholder="Select Status..."
        styles={selectStyles}
      />
    </div>

    <div className="col-12 col-md-4 col-lg-2">
      <label className="fw-bold mb-1">Filter By User:</label>
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

    <div className="col-6 col-md-2 col-lg-2">
      <label className="fw-bold mb-1">Start Date:</label>
      <input
        type="date"
        className="form-control"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </div>

    {/* End Date */}
    <div className="col-6 col-md-2 col-lg-2">
      <label className="fw-bold mb-1">End Date:</label>
      <input
        type="date"
        className="form-control"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </div>

    {/* Add Task Button */}
    <div className="col-12 col-md-2 col-lg-2 text-md-end">
      <button
        className="btn btn-primary w-100 mt-2 mt-md-0"
        onClick={handleAddTask}
      >
        + Add Task
      </button>
    </div>
  </div>


      <div
        className="table-responsive card p-4 border-0 shadow-sm bg-light"
        style={{
          width: "100%",
          overflowX: "auto",
          whiteSpace: "nowrap",
        }}
      >
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th>Title</th>
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
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted py-3">
                  No tasks found.
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task) => (
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
                    {task.assignedUser?.id !== id &&
                    task.assignedUser?.role !== "teamLead" ? (
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
                    ) : (
                      <div className="text-info">
                        {task.assignedUser.id === id
                          ? "Can't modify your own task"
                          : "Can't modify other Team Lead's task"}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={totalPages}
        pageSize={tasksPerPage}
        totalResults={filteredTasks.length}
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
                  Edit Task —{" "}
                  <span className="text-dark">{taskForm.title}</span>
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
                  onChange={(e) => {
                    setTaskForm({ ...taskForm, projectId: e.target.value });
                    if (errors.projectId && e.target.value)
                      setErrors((prev: any) => ({ ...prev, projectId: "" }));
                  }}
                >
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <small className="text-danger">{errors.projectId}</small>
                )}
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
                      setErrors((prev: any) => ({ ...prev, title: "" }));
                  }}
                />
                {errors.title && (
                  <small className="text-danger">{errors.title}</small>
                )}
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
                        const updatedForm = {
                          ...taskForm,
                          estimatedHours: value,
                        };

                        const {
                          estimatedHours,
                          estimatedMinutes,
                          estimatedSeconds,
                        } = updatedForm;
                        if (
                          estimatedHours > 0 ||
                          estimatedMinutes > 0 ||
                          estimatedSeconds > 0
                        ) {
                          setErrors((prev: any) => ({
                            ...prev,
                            estimatedTime: "",
                          }));
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
                        const updatedForm = {
                          ...taskForm,
                          estimatedMinutes: value,
                        };

                        const {
                          estimatedHours,
                          estimatedMinutes,
                          estimatedSeconds,
                        } = updatedForm;
                        if (
                          estimatedHours > 0 ||
                          estimatedMinutes > 0 ||
                          estimatedSeconds > 0
                        ) {
                          setErrors((prev: any) => ({
                            ...prev,
                            estimatedTime: "",
                          }));
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
                        const updatedForm = {
                          ...taskForm,
                          estimatedSeconds: value,
                        };

                        const {
                          estimatedHours,
                          estimatedMinutes,
                          estimatedSeconds,
                        } = updatedForm;
                        if (
                          estimatedHours > 0 ||
                          estimatedMinutes > 0 ||
                          estimatedSeconds > 0
                        ) {
                          setErrors((prev: any) => ({
                            ...prev,
                            estimatedTime: "",
                          }));
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

              {/* Assign User + Status (inline change ready) */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label>Assign User</label>
                  <select
                    className="form-select"
                    value={taskForm.assignedUserId}
                    onChange={(e) => {
                      setTaskForm({
                        ...taskForm,
                        assignedUserId: e.target.value,
                      });
                      if (errors.assignedUserId && e.target.value)
                        setErrors((prev: any) => ({
                          ...prev,
                          assignedUserId: "",
                        }));
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
                    <small className="text-danger">
                      {errors.assignedUserId}
                    </small>
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
                      handleStatusChange(currentTaskId, e.target.value);
                    }}
                  >
                    {Object.entries(statusMap).map(([key, { label }]) => (
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
                  setErrors({});
                  setShowModal(false);
                }}
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

export default TaskTl;
