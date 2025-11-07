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

const TaskTl: React.FC = () => {
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

export default TaskTl;

// "use client";
// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import {
//   getTasksByProject,
//   createTaskAdmin,
//   deleteTask,
//   getUsers,
//   getProjects,
//   updateTaskStatus,
//   updateTaskAdmin,
// } from "../../services/api";
// import { toast } from "react-toastify";
// import { jwtDecode } from "jwt-decode";

// const TaskTl: React.FC = () => {
//   const { id: projectId } = useParams<{ id: string }>();
//   const navigate = useNavigate();

//   const [tasks, setTasks] = useState<any[]>([]);
//   const [users, setUsers] = useState<any[]>([]);
//   const [proName, setProName] = useState<any>({});
//   const [showModal, setShowModal] = useState(false);
//   const [loading, setLoading] = useState(false);
  
//   const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
//   const todayDate = () => new Date().toISOString().split("T")[0];
//   const [selectedTask, setSelectedTask] = useState<any | null>(null);
//   const [editData, setEditData] = useState<any>({});
//   const [editModal, setEditModal] = useState(false);
//   const [id,setId]=useState("")
//   const [newTask, setNewTask] = useState({
//     title: "",
//     startDate: todayDate(),
//     endDate: todayDate(),
//     hours: 0,
//     minutes: 0,
//     seconds: 0,
//     assignedUserId: "",
//   });
//   const [taskEdits, setTaskEdits] = useState<{
//       [taskId: string]: {
//         endDate: string;
//         startDate: string;
//         title: string;
//         hours: number;
//         minutes: number;
//         seconds: number;
//         assignedUser?: string;
//       };
//     }>({});
//   const statusMap: Record<string, { label: string; bgColor: string }> = {
//   pending: { label: "Pending", bgColor: "#064393ff" },       
//   in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
//   code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
//   done: { label: "Done", bgColor: "#2bc22bff" },    
// };
//   useEffect(() => {
//     fetchTasks();
//     fetchUsers();
//     fetchProjects();
//     const token = localStorage.getItem("token");
//         if (token) {
//           const parsed = jwtDecode<any>(token);
//           setId(parsed.id || "");}
//   }, [projectId]);

//   const fetchProjects = async () => {
//     try {
//       const res = await getProjects();
//       const project = res.find((p: any) => p.id === projectId);
//       if (project) setProName(project);
//     } catch (error) {
//       console.error("Error fetching projects:", error);
//     }
//   };

//   const fetchTasks = async () => {
//     const res = await getTasksByProject(projectId!);
//     setTasks(res);
//   };
// const fetchUsers = async () => {
//   try {
//     const users = await getUsers();
//     const filtered = users.filter(
//       (u: any) => u.role?.toLowerCase() === "user"
//     );
//     setUsers(filtered);
//   } catch (error) {
//     console.error("Failed to fetch users:", error);
//   }
// };


//   const validateTask = () => {
//     if (!newTask.title.trim()) return "Task name is required.";
//     if (!newTask.assignedUserId) return "Please assign a user.";
//     if (!newTask.startDate) return "Start date is required.";
//     if (!newTask.endDate) return "End date is required.";
//     if (newTask.endDate < newTask.startDate)
//       return "End date cannot be before start date.";
//     if (
//       newTask.hours <= 0 &&
//       newTask.minutes <= 0 &&
//       newTask.seconds <= 0
//     )
//       return "At least one of Hours, Minutes, or Seconds must be greater than 0.";
//     return null;
//   };

//   const handleAddTask = async () => {
//     const error = validateTask();
//     if (error) return toast.error(error);

//     setLoading(true);
//     try {
//       const estimatedTime =
//         newTask.hours * 3600 + newTask.minutes * 60 + newTask.seconds;

//       const task = await createTaskAdmin(
//         projectId!,
//         newTask.title,
//         estimatedTime,
//         newTask.assignedUserId,
//         newTask.startDate,
//         newTask.endDate
//       );

//       setTasks((prev) => [...prev, task]);
//       toast.success("Task added successfully!");
//       setShowModal(false);
//       setNewTask({
//         title: "",
//         startDate: todayDate(),
//         endDate: todayDate(),
//         hours: 0,
//         minutes: 0,
//         seconds: 0,
//         assignedUserId: "",
//       });
//       fetchTasks()
//     } catch (err) {
//       toast.error("Error adding task!");
//     } finally {
//       setLoading(false);
//     }
//   };
//   const handleUpdateTask = async (taskId: string) => {
//     const edit = editData
  
//     if (!edit.startDate) {
//       toast.error("Start date is required");
//       return;
//     }
//     if (!edit.endDate) {
//       toast.error("End date is required");
//       return;
//     }
//     if (new Date(edit.endDate) < new Date(edit.startDate)) {
//       toast.error("End date cannot be before start date");
//       return;
//     }
  
//     const estimatedTime = edit.hours * 3600 + edit.minutes * 60 + edit.seconds;
  
//     const updated = await updateTaskAdmin(
//       taskId,
//       edit.title,
//       estimatedTime,
//       edit.assignedUser,
//       edit.startDate,
//       edit.endDate
//     );
  
//     toast.success(`Task ${updated.title} updated successfully...`);
//     fetchTasks();
//   //   setTasks((prevTasks) =>
//   //   prevTasks.map((t: any) =>
//   //     t.id === taskId ? { ...t, ...updated } : t
//   //   )
//   // );
//     // setProjects((prev) =>
//     //   prev.map((p) =>
//     //     p.id === projectId
//     //       ? {
//     //           ...p,
//     //           tasks: p.tasks?.map((t) =>
//     //             t.id === taskId ? { ...t, ...updated } : t
//     //           ),
//     //         }
//     //       : p
//     //   )
//     // );
  
//     setEditingTaskId(null);
  
//     setTaskEdits((prev) => ({
//       ...prev,
//       [taskId]: {
//         title: updated.title,
//         hours: Math.floor((updated.estimatedTime || 0) / 3600),
//         minutes: Math.floor(((updated.estimatedTime || 0) % 3600) / 60),
//         seconds: (updated.estimatedTime || 0) % 60,
//         assignedUser: updated.assignedUser?.id || "",
//         startDate: updated.startDate,
//         endDate: updated.endDate,
//       },
//     }));
//   };


//    const handleStatusChange = async (taskId: string, newStatus: string) => {
//     try {
//       const updatedTask = await updateTaskStatus(taskId, newStatus); 
      
//       setTasks((prevTasks) =>
//       prevTasks.map((t:any) => (t.id === taskId ? { ...t,status:updatedTask.status } : t))
//     );
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to update status");
//     }
//   };

//   const handleDeleteTask = async (taskId: string) => {
//   const confirmed = window.confirm("Are you sure you want to delete this task?");
//   if (!confirmed) return;

//   try {
//     await deleteTask(taskId);
//     toast.success("Task deleted!");
//     setTasks((prev) => prev.filter((t) => t.id !== taskId));
//   } catch (error) {
//     console.error("Error deleting task:", error);
//     toast.error("Failed to delete task. Please try again.");
//   }
// };

//   const formatDuration = (seconds: number) => {
//   if (!seconds || seconds <= 0) return "-";

//   const h = Math.floor(seconds / 3600);
//   const m = Math.floor((seconds % 3600) / 60);
//   const s = seconds % 60;

//   const parts: string[] = [];

//   if (h > 0) parts.push(`${h.toString().padStart(2, "0")}h`);
//   if (m > 0) parts.push(`${m.toString().padStart(2, "0")}m`);
//   if (s > 0) parts.push(`${s.toString().padStart(2, "0")}s`);

//   return parts.length > 0 ? parts.join(" ") : "-";
// };
//   return (
//     <div className="container mt-4">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <div>
//         <h3 className="m-0">
//           Tasks for Project: {proName?.name || "Loading..."}
//       <h5 className="text-muted">{proName?.description}</h5>

//         </h3>
//         </div><div>
//         <button className="btn btn-secondary" onClick={() => navigate(-1)}>
//           ← Back
//         </button>
//         <button className="btn btn-primary ms-1" onClick={() => setShowModal(true)}>
//           + Add Task
//         </button>
//         </div>
//       </div>


//       {/* Task card */}
//       <div className="mt-4 card p-3 shadow-sm" style={{background:"aliceblue"}}>
//   {tasks.length === 0 ? (
//     <p className="text-center text-muted">No tasks found.</p>
//   ) : (
//     <div className="row g-3">
//       {tasks.map((task) => {
//         const edit = taskEdits[task.id] || {};
//         const formattedStart = task.startDate?.split("T")[0];
//         const formattedEnd = task.endDate?.split("T")[0];

//         return (
//           <div className="col-md-6 col-lg-4" key={task.id}>
            
//             <div className="card shadow-sm border-1 h-100">
//               <div className="card-body">
//                 <h5 className="card-title mb-2 text-primary">{task.title}</h5>
//                 <p className="card-subtitle mb-3 text-muted">
//                   Assigned to:{" "}
//                   <strong>
//                     {task.assignedUser?.username || "Unassigned"}
//                   </strong>
//                 </p>

//                 <div className="row g-1 mb-3">
//   <div className="col-6 justify-content-start">
//     <span className="badge w-100 text-start" style={{background:"grey"}}>
//       Estimated: {formatDuration(task.estimatedTime || 0)}
//     </span>
//   </div>
//   <div className="col-6">
//     <span className="badge bg-info w-100 text-start">
//     Consumed: {formatDuration(task.totalTime || 0)}
//     </span>
//   </div>
//   <div className="col-6">
//     <span className="badge bg-success w-100 text-start">
//       Saved: {formatDuration(task.savedTime || 0)}
//     </span>
//   </div>
//   <div className="col-6">
//     <span className="badge bg-warning text-dark w-100 text-start">
//       Overtime: {formatDuration(task.overtime || 0)}
//     </span>
//   </div>
//                 </div>


//                 <div className="d-flex justify-content-between small mb-2">
//                   <span>Start: {formattedStart || "-"}</span>
//                   <span>End: {formattedEnd || "-"}</span>
//                 </div>

//                 <div className="d-flex justify-content-between align-items-center">
//                   <span
//                     className="badge"
//                     style={{
//                       backgroundColor:
//                         statusMap[task.status]?.bgColor || "#6c757d",
//                       color: "#fff",
//                     }}
//                   >
//                     {statusMap[task.status]?.label || task.status}
//                   </span>
// {task.assignedUser.id !== id ?(
//                   <div className="d-flex gap-2">
//                     <button
//   className="btn btn-sm btn-outline-primary"
//   onClick={() => {
//     setSelectedTask(task);
//     setEditData({
//       title: task.title,
//       hours: Math.floor((task.estimatedTime || 0) / 3600),
//       minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
//       seconds: (task.estimatedTime || 0) % 60,
//       assignedUser: task.assignedUser?.id || task.assignedUserId || "",
//       startDate: task.startDate?.split("T")[0] || "",
//       endDate: task.endDate?.split("T")[0] || "",
//       status: task.status,
//     });
//     setEditModal(true);
//   }}
// >
//   <i className="bi bi-pencil"></i> Edit
// </button>

//                     <button
//                       className="btn btn-sm btn-outline-danger"
//                       onClick={() => handleDeleteTask(task.id)}
//                     >
//                       <i className="bi bi-trash"></i> Delete
//                     </button>
//                   </div>)
                  
//                 :<button
//                       className="btn btn-sm btn-outline-success"
//                       onClick={() => navigate("/tlTask")}
//                     >
//                       View Task
//                     </button>}
//                 </div>
//               </div>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   )}
// </div>

// {/* ✅ Edit Task Modal */}
// {editModal && selectedTask && (
//   <div
//     className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
//     style={{
//       background: "rgba(0,0,0,0.5)",
//       zIndex: 1050,
//       overflowY: "auto",
//     }}
//   >
//     <div
//       className="bg-white p-4 rounded shadow"
//       style={{ width: "90%", maxWidth: "700px" }}
//     >
//       <h5 className="mb-3 text-center text-primary">
//         Edit Task — <span className="text-dark">{selectedTask.title}</span>
//       </h5>

//       <div className="d-flex flex-column gap-3">
//         {/* Task Name */}
//         <div>
//           <label>Task Name</label>
//           <input
//             type="text"
//             className="form-control"
//             value={editData.title}
//             onChange={(e) =>
//               setEditData({ ...editData, title: e.target.value })
//             }
//           />
//         </div>

//         {/* Dates */}
//         <div className="row g-3">
//           <div className="col-md-6">
//             <label>Start Date</label>
//             <input
//               type="date"
//               className="form-control"
//               value={editData.startDate}
//               onChange={(e) =>
//                 setEditData({ ...editData, startDate: e.target.value })
//               }
//             />
//           </div>
//           <div className="col-md-6">
//             <label>End Date</label>
//             <input
//               type="date"
//               className="form-control"
//               min={editData.startDate || ""}
//               value={editData.endDate}
//               onChange={(e) =>
//                 setEditData({ ...editData, endDate: e.target.value })
//               }
//             />
//           </div>
//         </div>

//         {/* Time Inputs */}
//         <div className="row g-3">
//           <div className="col-md-4">
//             <label>Hours</label>
//             <input
//               type="number"
//               className="form-control"
//               min={0}
//               value={editData.hours}
//               onChange={(e) =>
//                 setEditData({ ...editData, hours: +e.target.value })
//               }
//             />
//           </div>
//           <div className="col-md-4">
//             <label>Minutes</label>
//             <input
//               type="number"
//               className="form-control"
//               min={0}
//               value={editData.minutes}
//               onChange={(e) =>
//                 setEditData({ ...editData, minutes: +e.target.value })
//               }
//             />
//           </div>
//           <div className="col-md-4">
//             <label>Seconds</label>
//             <input
//               type="number"
//               className="form-control"
//               min={0}
//               value={editData.seconds}
//               onChange={(e) =>
//                 setEditData({ ...editData, seconds: +e.target.value })
//               }
//             />
//           </div>
//         </div>

//         {/* Assign User + Status */}
//         <div className="row g-3">
//           <div className="col-md-6">
//             <label>Assign User</label>
//             <select
//               className="form-select"
//               value={editData.assignedUser}
//               onChange={(e) =>
//                 setEditData({ ...editData, assignedUser: e.target.value })
//               }
//             >
//               <option value="">Select User</option>
//               {users.map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.username}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="col-md-6">
//             <label>Status</label>
//             <select
//               className="form-select"
//               value={editData.status}
//               onChange={(e) =>{
//                 setEditData({ ...editData, status: e.target.value })
//                 handleStatusChange(selectedTask.id,e.target.value)}
//               }
//             >
//               {Object.entries(statusMap).map(([key, { label }]) => (
//                 <option key={key} value={key}>
//                   {label}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Buttons */}
//       <div className="d-flex justify-content-between align-items-center mt-4">
//         <button
//           className="btn btn-secondary"
//           onClick={() => setEditModal(false)}
//         >
//           Close
//         </button>
//         <button
//           className="btn btn-success"
//           onClick={() => {
//             handleUpdateTask(selectedTask.id);
//             setEditModal(false);
//           }}
//         >
//           Save Changes
//         </button>
//       </div>
//     </div>
//   </div>
// )}




//       {/* <div className="card mt-4 shadow-sm border-0">
//   <div className="card-body p-0">
//     <div className="table-responsive">
//       <table
//         className="table table-bordered mt-0 align-middle mb-0"
//         style={{
//           tableLayout: "fixed",
//           width: "100%",
//           wordWrap: "break-word",
//         }}
//       >
//         <thead className="table-light">
//           <tr>
//             <th style={{ width: "15%" }}>Task Name</th>
//             <th style={{ width: "6%" }}>HH</th>
//             <th style={{ width: "6%" }}>MM</th>
//             <th style={{ width: "6%" }}>SS</th>
//             <th style={{ width: "12%" }}>Time Consume</th>
//             <th style={{ width: "12%" }}>Saved Time</th>
//             <th style={{ width: "12%" }}>Overtime</th>
//             <th style={{ width: "12%" }}>Start Date</th>
//             <th style={{ width: "12%" }}>End Date</th>
//             <th style={{ width: "10%" }}>Assigned User</th>
//             <th style={{ width: "14%" }}>Status</th>
//             <th style={{ width: "12%" }}>Actions</th>
//           </tr>
//         </thead>

//         <tbody>
//           {tasks.length === 0 ? (
//             <tr>
//               <td colSpan={12} className="text-center text-muted py-4">
//                 No tasks found.
//               </td>
//             </tr>
//           ) : (
//             tasks.map((task) => {
//               const isEditing = editingTaskId === task.id;
//               const edit = taskEdits[task.id] || {
//                 title: task.title,
//                 hours: Math.floor((task.estimatedTime || 0) / 3600),
//                 minutes: Math.floor(((task.estimatedTime || 0) % 3600) / 60),
//                 seconds: (task.estimatedTime || 0) % 60,
//                 assignedUser:
//                   task.assignedUser?.id || task.assignedUserId || "",
//                 startDate: task.startDate?.split("T")[0] || "",
//                 endDate: task.endDate?.split("T")[0] || "",
//               };

//               return (
//                 <tr key={task.id}>
//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="text"
//                         className="form-control"
//                         value={edit.title}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: { ...edit, title: e.target.value },
//                           }))
//                         }
//                       />
//                     ) : (
//                       task.title
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={edit.hours}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               hours: Number(e.target.value),
//                             },
//                           }))
//                         }
//                       />
//                     ) : (
//                       Math.floor((task.estimatedTime || 0) / 3600)
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={edit.minutes}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               minutes: Number(e.target.value),
//                             },
//                           }))
//                         }
//                       />
//                     ) : (
//                       Math.floor(((task.estimatedTime || 0) % 3600) / 60)
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="number"
//                         className="form-control form-control-sm"
//                         value={edit.seconds}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               seconds: Number(e.target.value),
//                             },
//                           }))
//                         }
//                       />
//                     ) : (
//                       (task.estimatedTime || 0) % 60
//                     )}
//                   </td>

//                   <td>
//                     <span className="badge bg-info">
//                       {formatDuration(task.totalTime || 0)}
//                     </span>
//                   </td>

//                   <td>
//                     <span className="badge bg-success">
//                       {formatDuration(task.savedTime || 0)}
//                     </span>
//                   </td>

//                   <td>
//                     <span className="badge bg-warning text-dark">
//                       {formatDuration(task.overtime || 0)}
//                     </span>
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="date"
//                         className="form-control"
//                         value={edit.startDate}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               startDate: e.target.value,
//                             },
//                           }))
//                         }
//                       />
//                     ) : (
//                       task.startDate?.split("T")[0] || "-"
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <input
//                         type="date"
//                         className="form-control"
//                         min={edit.startDate || ""}
//                         value={edit.endDate}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               endDate: e.target.value,
//                             },
//                           }))
//                         }
//                       />
//                     ) : (
//                       task.endDate?.split("T")[0] || "-"
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <select
//                         className="form-select"
//                         value={edit.assignedUser}
//                         onChange={(e) =>
//                           setTaskEdits((prev) => ({
//                             ...prev,
//                             [task.id]: {
//                               ...edit,
//                               assignedUser: e.target.value,
//                             },
//                           }))
//                         }
//                       >
//                         <option value="">Select User</option>
//                         {users.map((u) => (
//                           <option key={u.id} value={u.id}>
//                             {u.username}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       task.assignedUser?.username || "Unassigned"
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <select
//                         value={task.status}
//                         onChange={(e) =>
//                           handleStatusChange(task.id, e.target.value)
//                         }
//                         className="form-select"
//                       >
//                         {Object.entries(statusMap).map(([key, { label }]) => (
//                           <option key={key} value={key}>
//                             {label}
//                           </option>
//                         ))}
//                       </select>
//                     ) : (
//                       <span
//                         style={{
//                           padding: "4px 8px",
//                           borderRadius: "4px",
//                           color: "#fff",
//                           backgroundColor:
//                             statusMap[task.status]?.bgColor || "#6c757d",
//                           textAlign: "center",
//                           display: "inline-block",
//                         }}
//                       >
//                         {statusMap[task.status]?.label || task.status}
//                       </span>
//                     )}
//                   </td>

//                   <td>
//                     {isEditing ? (
//                       <>
//                         <button
//                           className="btn btn-sm btn-success w-100 mb-2"
//                           onClick={() => handleUpdateTask(task.id)}
//                         >
//                           Save
//                         </button>
//                         <button
//                           className="btn btn-sm btn-secondary w-100"
//                           onClick={() => setEditingTaskId(null)}
//                         >
//                           Cancel
//                         </button>
//                       </>
//                     ) : (
//                       <>
//                         <button
//                           className="btn btn-sm btn-primary w-100 mb-2"
//                           onClick={() => {
//                             setEditingTaskId(task.id);
//                             setTaskEdits((prev) => ({
//                               ...prev,
//                               [task.id]: {
//                                 title: task.title,
//                                 hours: Math.floor(
//                                   (task.estimatedTime || 0) / 3600
//                                 ),
//                                 minutes: Math.floor(
//                                   ((task.estimatedTime || 0) % 3600) / 60
//                                 ),
//                                 seconds: (task.estimatedTime || 0) % 60,
//                                 assignedUser:
//                                   task.assignedUser?.id ||
//                                   task.assignedUserId ||
//                                   "",
//                                 startDate: task.startDate?.split("T")[0],
//                                 endDate: task.endDate?.split("T")[0],
//                               },
//                             }));
//                           }}
//                         >
//                           Update
//                         </button>
//                         <button
//                           className="btn btn-sm btn-danger w-100"
//                           onClick={() => handleDeleteTask(task.id)}
//                         >
//                           Delete
//                         </button>
//                       </>
//                     )}
//                   </td>
//                 </tr>
//               );
//             })
//           )}
//         </tbody>
//       </table>
//     </div>
//   </div>
// </div> */}


//       {/* Modal */}
//       {showModal && (
//   <div
//     className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
//     style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 ,overflowY:"auto"}}
//   >
//     <div className="bg-white p-4 rounded shadow" style={{ width: "90%", maxWidth: "600px" }}>
//       <h5 className="mb-3 text-center">Add New Task</h5>

//       <div className="d-flex flex-column gap-3">
//         {/* Task Name */}
//         <div>
//           <label>Task Name</label>
//           <input
//             type="text"
//             className="form-control"
//             value={newTask.title}
//             onChange={(e) =>
//               setNewTask({ ...newTask, title: e.target.value })
//             }
//           />
//         </div>

//         {/* Start Date */}
//         <div>
//           <label>Start Date</label>
//           <input
//             type="date"
//             className="form-control"
//             value={newTask.startDate}
//             onChange={(e) => {
//               const startDate = e.target.value;
//               setNewTask((prev) => ({
//                 ...prev,
//                 startDate,
//                 endDate: prev.endDate < startDate ? startDate : prev.endDate,
//               }));
//             }}
//           />
//         </div>

//         {/* End Date */}
//         <div>
//           <label>End Date</label>
//           <input
//             type="date"
//             className="form-control"
//             value={newTask.endDate}
//             min={newTask.startDate}
//             onChange={(e) =>
//               setNewTask({ ...newTask, endDate: e.target.value })
//             }
//           />
//         </div>

//         {/* Hours */}
//         <div className="row g-3">
//   {/* Hours */}
//   <div className="col-md-6">
//     <label>Hours</label>
//     <input
//       type="number"
//       className="form-control"
//       value={newTask.hours}
//       min={0}
//       onChange={(e) =>
//         setNewTask({ ...newTask, hours: +e.target.value })
//       }
//     />
//   </div>

//   {/* Minutes */}
//   <div className="col-md-6">
//     <label>Minutes</label>
//     <input
//       type="number"
//       className="form-control"
//       value={newTask.minutes}
//       onChange={(e) =>
//         setNewTask({ ...newTask, minutes: +e.target.value })
//       }
//       min={0}
//     />
//   </div>

//   {/* Seconds */}
//   <div className="col-md-6">
//     <label>Seconds</label>
//     <input
//       type="number"
//       className="form-control"
//       value={newTask.seconds}
//       onChange={(e) =>
//         setNewTask({ ...newTask, seconds: +e.target.value })
//       }
//       min={0}
//     />
//   </div>

//   {/* Assign User */}
//   <div className="col-md-6">
//     <label>Assign User</label>
//     <select
//       className="form-select"
//       value={newTask.assignedUserId}
//       onChange={(e) =>
//         setNewTask({ ...newTask, assignedUserId: e.target.value })
//       }
//     >
//       <option value="">Select User</option>
//       {users.map((u) => (
//         <option key={u.id} value={u.id}>
//           {u.username}
//         </option>
//       ))}
//     </select>
//   </div>
// </div>

//       </div>

//       {/* Buttons Row */}
//       <div className="d-flex justify-content-between align-items-center mt-4">
        
//         <button
//           className="btn btn-secondary"
//           onClick={() => setShowModal(false)}
//         >
//           Close
//         </button>
//         <button
//           className="btn btn-primary"
//           onClick={handleAddTask}
//           disabled={loading}
//         >
//           {loading ? "Adding..." : "Add Task"}
//         </button>
//       </div>
//     </div>
//   </div>
// )}

//     </div>
//   );
// };

// export default TaskTl;
