"use client";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTasksByProject,
  createTaskAdmin,
  deleteTask,
  getUsers,
  getProjects,
  updateTaskStatus,
  updateTaskAdmin,
} from "../../services/api";
import { toast } from "react-toastify";

const SuperAdminTask: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [proName, setProName] = useState<any>({});
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const todayDate = () => new Date().toISOString().split("T")[0];
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [editModal, setEditModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    startDate: todayDate(),
    endDate: todayDate(),
    hours: 0,
    minutes: 0,
    seconds: 0,
    assignedUserId: "",
  });
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
  const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};
  useEffect(() => {
    fetchTasks();
    fetchUsers();
    fetchProjects();
  }, [projectId]);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      const project = res.find((p: any) => p.id === projectId);
      if (project) setProName(project);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTasks = async () => {
    const res = await getTasksByProject(projectId!);
    setTasks(res);
  };

  const fetchUsers = async () => {
    const u = await getUsers();
    setUsers(u);
  };

  const validateTask = () => {
    if (!newTask.title.trim()) return "Task name is required.";
    if (!newTask.assignedUserId) return "Please assign a user.";
    if (!newTask.startDate) return "Start date is required.";
    if (!newTask.endDate) return "End date is required.";
    if (newTask.endDate < newTask.startDate)
      return "End date cannot be before start date.";
    if (
      newTask.hours <= 0 &&
      newTask.minutes <= 0 &&
      newTask.seconds <= 0
    )
      return "At least one of Hours, Minutes, or Seconds must be greater than 0.";
    return null;
  };

  const handleAddTask = async () => {
    const error = validateTask();
    if (error) return toast.error(error);

    setLoading(true);
    try {
      const estimatedTime =
        newTask.hours * 3600 + newTask.minutes * 60 + newTask.seconds;

      const task = await createTaskAdmin(
        projectId!,
        newTask.title,
        estimatedTime,
        newTask.assignedUserId,
        newTask.startDate,
        newTask.endDate
      );

      setTasks((prev) => [...prev, task]);
      toast.success("Task added successfully!");
      setShowModal(false);
      setNewTask({
        title: "",
        startDate: todayDate(),
        endDate: todayDate(),
        hours: 0,
        minutes: 0,
        seconds: 0,
        assignedUserId: "",
      });
      fetchTasks()
    } catch (err) {
      toast.error("Error adding task!");
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateTask = async (taskId: string) => {
    const edit = editData
  
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
    fetchTasks();
  //   setTasks((prevTasks) =>
  //   prevTasks.map((t: any) =>
  //     t.id === taskId ? { ...t, ...updated } : t
  //   )
  // );
    // setProjects((prev) =>
    //   prev.map((p) =>
    //     p.id === projectId
    //       ? {
    //           ...p,
    //           tasks: p.tasks?.map((t) =>
    //             t.id === taskId ? { ...t, ...updated } : t
    //           ),
    //         }
    //       : p
    //   )
    // );
  
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

  const handleDeleteTask = async (taskId: string) => {
  const confirmed = window.confirm("Are you sure you want to delete this task?");
  if (!confirmed) return;

  try {
    await deleteTask(taskId);
    toast.success("Task deleted!");
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  } catch (error) {
    console.error("Error deleting task:", error);
    toast.error("Failed to delete task. Please try again.");
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
        <h3 className="m-0">
          Tasks for Project: {proName?.name || "Loading..."}
      <h5 className="text-muted">{proName?.description}</h5>

        </h3>
        </div><div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <button className="btn btn-primary ms-1" onClick={() => setShowModal(true)}>
          + Add Task
        </button>
        </div>
      </div>


      {/* Task card */}
      <div className="mt-4 card p-3 shadow-sm" style={{background:"aliceblue"}}>
  {tasks.length === 0 ? (
    <p className="text-center text-muted">No tasks found.</p>
  ) : (
    <div className="row g-3">
      {tasks.map((task) => {
        const edit = taskEdits[task.id] || {};
        const formattedStart = task.startDate?.split("T")[0];
        const formattedEnd = task.endDate?.split("T")[0];

        return (
          <div className="col-md-6 col-lg-4" key={task.id}>
            
            <div className="card shadow-sm border-1 h-100">
              <div className="card-body">
                <h5 className="card-title mb-2 text-primary">{task.title}</h5>
                <p className="card-subtitle mb-3 text-muted">
                  Assigned to:{" "}
                  <strong>
                    {task.assignedUser?.username || "Unassigned"}
                  </strong>
                </p>

                <div className="row g-1 mb-3">
  <div className="col-6 justify-content-start">
    <span className="badge w-100 text-start" style={{background:"grey"}}>
      Estimated: {formatDuration(task.estimatedTime || 0)}
    </span>
  </div>
  <div className="col-6">
    <span className="badge bg-info w-100 text-start">
    Consumed: {formatDuration(task.totalTime || 0)}
    </span>
  </div>
  <div className="col-6">
    <span className="badge bg-success w-100 text-start">
      Saved: {formatDuration(task.savedTime || 0)}
    </span>
  </div>
  <div className="col-6">
    <span className="badge bg-warning text-dark w-100 text-start">
      Overtime: {formatDuration(task.overtime || 0)}
    </span>
  </div>
                </div>


                <div className="d-flex justify-content-between small mb-2">
                  <span>Start: {formattedStart || "-"}</span>
                  <span>End: {formattedEnd || "-"}</span>
                </div>

                <div className="d-flex justify-content-between align-items-center">
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

                  <div className="d-flex gap-2">
                    <button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    setSelectedTask(task);
    setEditData({
      title: task.title,
      hours: Math.floor((task.estimatedTime || 0) / 3600),
      minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
      seconds: (task.estimatedTime || 0) % 60,
      assignedUser: task.assignedUser?.id || task.assignedUserId || "",
      startDate: task.startDate?.split("T")[0] || "",
      endDate: task.endDate?.split("T")[0] || "",
      status: task.status,
    });
    setEditModal(true);
  }}
>
  <i className="bi bi-pencil"></i> Edit
</button>

                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <i className="bi bi-trash"></i> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>

{/* ✅ Edit Task Modal */}
{editModal && selectedTask && (
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
        Edit Task — <span className="text-dark">{selectedTask.title}</span>
      </h5>

      <div className="d-flex flex-column gap-3">
        {/* Task Name */}
        <div>
          <label>Task Name</label>
          <input
            type="text"
            className="form-control"
            value={editData.title}
            onChange={(e) =>
              setEditData({ ...editData, title: e.target.value })
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
              value={editData.startDate}
              onChange={(e) =>
                setEditData({ ...editData, startDate: e.target.value })
              }
            />
          </div>
          <div className="col-md-6">
            <label>End Date</label>
            <input
              type="date"
              className="form-control"
              min={editData.startDate || ""}
              value={editData.endDate}
              onChange={(e) =>
                setEditData({ ...editData, endDate: e.target.value })
              }
            />
          </div>
        </div>

        {/* Time Inputs */}
        <div className="row g-3">
          <div className="col-md-4">
            <label>Hours</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={editData.hours}
              onChange={(e) =>
                setEditData({ ...editData, hours: +e.target.value })
              }
            />
          </div>
          <div className="col-md-4">
            <label>Minutes</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={editData.minutes}
              onChange={(e) =>
                setEditData({ ...editData, minutes: +e.target.value })
              }
            />
          </div>
          <div className="col-md-4">
            <label>Seconds</label>
            <input
              type="number"
              className="form-control"
              min={0}
              value={editData.seconds}
              onChange={(e) =>
                setEditData({ ...editData, seconds: +e.target.value })
              }
            />
          </div>
        </div>

        {/* Assign User + Status */}
        <div className="row g-3">
          <div className="col-md-6">
            <label>Assign User</label>
            <select
              className="form-select"
              value={editData.assignedUser}
              onChange={(e) =>
                setEditData({ ...editData, assignedUser: e.target.value })
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
              value={editData.status}
              onChange={(e) =>{
                setEditData({ ...editData, status: e.target.value })
                handleStatusChange(selectedTask.id,e.target.value)}
              }
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
          onClick={() => setEditModal(false)}
        >
          Close
        </button>
        <button
          className="btn btn-success"
          onClick={() => {
            handleUpdateTask(selectedTask.id);
            setEditModal(false);
          }}
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}




      {/* <div className="card mt-4 shadow-sm border-0">
  <div className="card-body p-0">
    <div className="table-responsive">
      <table
        className="table table-bordered mt-0 align-middle mb-0"
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
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={12} className="text-center text-muted py-4">
                No tasks found.
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const isEditing = editingTaskId === task.id;
              const edit = taskEdits[task.id] || {
                title: task.title,
                hours: Math.floor((task.estimatedTime || 0) / 3600),
                minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
                seconds: (task.estimatedTime || 0) % 60,
                assignedUser:
                  task.assignedUser?.id || task.assignedUserId || "",
                startDate: task.startDate?.split("T")[0] || "",
                endDate: task.endDate?.split("T")[0] || "",
              };

              return (
                <tr key={task.id}>
                  <td>
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

                  <td>
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

                  <td>
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

                  <td>
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

                  <td>
                    <span className="badge bg-info">
                      {formatDuration(task.totalTime || 0)}
                    </span>
                  </td>

                  <td>
                    <span className="badge bg-success">
                      {formatDuration(task.savedTime || 0)}
                    </span>
                  </td>

                  <td>
                    <span className="badge bg-warning text-dark">
                      {formatDuration(task.overtime || 0)}
                    </span>
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        className="form-control"
                        value={edit.startDate}
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
                    ) : (
                      task.startDate?.split("T")[0] || "-"
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        className="form-control"
                        min={edit.startDate || ""}
                        value={edit.endDate}
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
                    ) : (
                      task.endDate?.split("T")[0] || "-"
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <select
                        className="form-select"
                        value={edit.assignedUser}
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
                        onChange={(e) =>
                          handleStatusChange(task.id, e.target.value)
                        }
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
                          backgroundColor:
                            statusMap[task.status]?.bgColor || "#6c757d",
                          textAlign: "center",
                          display: "inline-block",
                        }}
                      >
                        {statusMap[task.status]?.label || task.status}
                      </span>
                    )}
                  </td>

                  <td>
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-sm btn-success w-100 mb-2"
                          onClick={() => handleUpdateTask(task.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-secondary w-100"
                          onClick={() => setEditingTaskId(null)}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-primary w-100 mb-2"
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
                                startDate: task.startDate?.split("T")[0],
                                endDate: task.endDate?.split("T")[0],
                              },
                            }));
                          }}
                        >
                          Update
                        </button>
                        <button
                          className="btn btn-sm btn-danger w-100"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  </div>
</div> */}


      {/* Modal */}
      {showModal && (
  <div
    className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
    style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 ,overflowY:"auto"}}
  >
    <div className="bg-white p-4 rounded shadow" style={{ width: "90%", maxWidth: "600px" }}>
      <h5 className="mb-3 text-center">Add New Task</h5>

      <div className="d-flex flex-column gap-3">
        {/* Task Name */}
        <div>
          <label>Task Name</label>
          <input
            type="text"
            className="form-control"
            value={newTask.title}
            onChange={(e) =>
              setNewTask({ ...newTask, title: e.target.value })
            }
          />
        </div>

        {/* Start Date */}
        <div>
          <label>Start Date</label>
          <input
            type="date"
            className="form-control"
            value={newTask.startDate}
            onChange={(e) => {
              const startDate = e.target.value;
              setNewTask((prev) => ({
                ...prev,
                startDate,
                endDate: prev.endDate < startDate ? startDate : prev.endDate,
              }));
            }}
          />
        </div>

        {/* End Date */}
        <div>
          <label>End Date</label>
          <input
            type="date"
            className="form-control"
            value={newTask.endDate}
            min={newTask.startDate}
            onChange={(e) =>
              setNewTask({ ...newTask, endDate: e.target.value })
            }
          />
        </div>

        {/* Hours */}
        <div className="row g-3">
  {/* Hours */}
  <div className="col-md-6">
    <label>Hours</label>
    <input
      type="number"
      className="form-control"
      value={newTask.hours}
      min={0}
      onChange={(e) =>
        setNewTask({ ...newTask, hours: +e.target.value })
      }
    />
  </div>

  {/* Minutes */}
  <div className="col-md-6">
    <label>Minutes</label>
    <input
      type="number"
      className="form-control"
      value={newTask.minutes}
      onChange={(e) =>
        setNewTask({ ...newTask, minutes: +e.target.value })
      }
      min={0}
    />
  </div>

  {/* Seconds */}
  <div className="col-md-6">
    <label>Seconds</label>
    <input
      type="number"
      className="form-control"
      value={newTask.seconds}
      onChange={(e) =>
        setNewTask({ ...newTask, seconds: +e.target.value })
      }
      min={0}
    />
  </div>

  {/* Assign User */}
  <div className="col-md-6">
    <label>Assign User</label>
    <select
      className="form-select"
      value={newTask.assignedUserId}
      onChange={(e) =>
        setNewTask({ ...newTask, assignedUserId: e.target.value })
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
</div>

      </div>

      {/* Buttons Row */}
      <div className="d-flex justify-content-between align-items-center mt-4">
        
        <button
          className="btn btn-secondary"
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
        <button
          className="btn btn-primary"
          onClick={handleAddTask}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Task"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
};

export default SuperAdminTask;
