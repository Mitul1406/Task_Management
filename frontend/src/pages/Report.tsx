


import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getTasksByProject, getProjects, getUsers } from "../services/api"; 
import html2pdf from "html2pdf.js";
import { jwtDecode } from "jwt-decode";
interface Task {
  status: string;
  id: string;
  title: string;
  estimatedTime: number;
  totalTime: number;
  startDate?: string;
  endDate?: string;
  assignedUser?: { id: string; username: string };
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
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
export default function Report() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null)
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const allUsers = await getUsers();
        setUsers(allUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);
  const formatDate = (val: any) => {
  if (!val) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const n = Number(val);
  if (isNaN(n)) return "";
  return new Date(n).toISOString().split("T")[0];
};

  useEffect(() => {
    const loadReport = async () => {
      try {
        const allProjects = await getProjects();
        const proj = allProjects.find((p: Project) => p.id === projectId);
        setProject(proj);

        if (projectId) {
          const taskList = await getTasksByProject(projectId);
          setTasks(taskList);
        }
      } catch (err) {
        console.error("Failed to load report:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [projectId]);
const filteredTasks = useMemo(() => {
  if (!tasks || tasks.length === 0) return [];

  return tasks.filter((task: any) => {
    const taskStart = new Date(task.startDate);
    const taskEnd = new Date(task.endDate);

    const startOk = !startDate || new Date(startDate) <= taskEnd;
    const endOk = !endDate || new Date(endDate) >= taskStart;

    const userOk =
      !selectedUser || // ✅ Show all when user not selected
      selectedUser === "all" ||
      task.users?.some((u: any) => u.id === selectedUser);

    return startOk && endOk && userOk;
  });
}, [tasks, selectedUser, startDate, endDate]);

const userTasks = useMemo(() => {
  return filteredTasks.reduce((acc: Record<string, any[]>, task: any) => {
    if (!Array.isArray(task.users)) return acc;

    task.users.forEach((user: any) => {
      const userId = user?.id || user?.username || "unknown";
      if (!acc[userId]) acc[userId] = [];

      acc[userId].push({
        id: task.id,
        title: task.title,
        estimatedTime: task.estimatedTime || 0,
        status: task.status,
        startDate: task.startDate,
        endDate: task.endDate,
        username: user.username,
        userTime: user.totalTime ?? 0,
        userOvertime: task.overtime ?? 0,
        userSaved: task.savedTime ?? 0,
      });
    });

    return acc;
  }, {});
}, [filteredTasks]);

  if (loading) return <div>Loading report...</div>;
  if (!project) return <div>Project not found</div>;

  const totalEstimated = filteredTasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalUsed = filteredTasks.reduce((sum, t) => sum + (t.totalTime || 0), 0);
  const totalOvertime = filteredTasks.reduce((sum, t) => sum + ((t as any).overtime || 0), 0);
  const totalSaved = filteredTasks.reduce((sum, t) => sum + ((t as any).savedTime || 0), 0);

  const tasksById = tasks.reduce((acc: Record<string, any>, task: any) => {
    console.log("shsuhsus8x8sxs8x---->",task);
    
  acc[task.id] = {
    ...task,
    users: task.users.map((user: any) => ({
      id: user.id,
      username: user.username,
      totalTime: user.totalTime ?? 0,
    })),
  };
  return acc;
}, {});



Object.entries(userTasks).forEach(([userId, tasks]) => {
  console.log(userId, tasks);
});


  const handleDownloadPDF=()=>{
    if(reportRef.current)
    {
        const el:any=reportRef.current
        const opt:any={
            margin:0.1,
            filename:`${project.name}-report.pdf`,
            image:{type:"jpeg",quality:0.98},
            html2canvas:{scale:2},
            jsPDF:{unit:"in",format:"a4",orientation:"portrait"}
        };
        html2pdf().set(opt).from(el).save()
    }
  }
return (
  <>
  <div className="mt-4 position-relative">
  <div className="d-flex justify-content-end align-items-center position-relative mb-3 flex-wrap gap-2">
      {/* --- Filters Section --- */}
      <div
        className="d-flex align-items-center flex-wrap gap-3 me-auto"
        style={{ position: "absolute", top: "25px", right: "140px" }}
      >
        {/* User Filter */}
        <div className="d-flex flex-column">
          <label htmlFor="userSelect" className="form-label mb-1 fw-semibold">
            User
          </label>
          <select
            id="userSelect"
            className="form-select form-select-sm"
            style={{ minWidth: "180px" }}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="">Select User</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="d-flex flex-column">
          <label htmlFor="startDate" className="form-label mb-1 fw-semibold">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            className="form-control form-control-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ minWidth: "150px" }}
          />
        </div>

        {/* End Date */}
        <div className="d-flex flex-column">
          <label htmlFor="endDate" className="form-label mb-1 fw-semibold">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            className="form-control form-control-sm"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ minWidth: "150px" }}
          />
        </div>

      {/* --- Download Button --- */}
      
        <div className="d-flex flex-column mt-3">
        <button
          className="btn btn-primary"
          onClick={handleDownloadPDF}
        >
          📄 Download PDF
        </button>
        </div>
      </div>
  </div>
    <div className="container mt-4" ref={reportRef}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h2 className="mb-0">{project.name} - Report</h2>
          <small className="text-muted">
            Report Period:{" "}
            {(project as any).createdAt
              ? formatDate(startDate)
              : "-"}{" "}
            → {formatDate(endDate)}
          </small>
        </div>
        
      </div>

      {project.description && (
        <p className="text-secondary">{project.description}</p>
      )}

      {/* Totals + Worked Users */}
      <div className="row mb-4">
        {/* Totals */}
        <div className="col-md-6 mb-3">
          <div className="card p-3 shadow-sm h-100">
            <h5 className="mb-3">Overall Totals</h5>
            <p><strong>Total Estimated:</strong> {formatDuration(totalEstimated)}</p>
            <p><strong>Total Used:</strong> {formatDuration(totalUsed)}</p>
            <p className="text-danger">
              <strong>Total Overtime:</strong>{" "}
              {formatDuration(totalOvertime)}
            </p>
            <p className="text-success">
              <strong>Total Saved:</strong>{" "}
              {formatDuration(totalSaved)}
            </p>
          </div>
        </div>

        {/* Worked Users */}
        <div className="col-md-6 mb-3">
          <div className="card p-3 shadow-sm h-100">
            <h5 className="mb-3">Worked Users</h5>
            <ul className="list-group list-group-flush">
              {Array.from(
    new Set(
      tasks
        .flatMap((t: any) => t.users.map((u: any) => u.username)) 
        .filter(Boolean) 
    )
  ).map((username, idx) => (
    <li key={idx} className="list-group-item">
      👤 {username}
    </li>
  ))}

              {tasks.filter((t: any) => !t.assignedUser).length > 0 && (
                <li className="list-group-item text-muted">
                  Unassigned Tasks Present
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* User Breakdown */}
 {/* User Breakdown */}
<h4 className="mb-3">User Breakdown</h4>
{Object.entries(userTasks).map(([userId, userTaskList]: any) => {
    const username = userTaskList[0]?.username || "Unknown";
  // Sum per-user values for all tasks
  const est = userTaskList.reduce((sum: number, t: any) => sum + (t.estimatedTime || 0), 0);
  const used = userTaskList.reduce((sum: number, t: any) => sum + (t.userTime || 0), 0);
  const overtime = userTaskList.reduce((sum: number, t: any) => sum + (t.userOvertime || 0), 0);
  const saved = userTaskList.reduce((sum: number, t: any) => sum + (t.userSaved || 0), 0);

  return (
    <div key={userId} className="card mb-3 p-3 shadow-sm">
      <h5>{username}</h5>
      <p>
        Estimated: {formatDuration(est)} | Used: {formatDuration(used)} <br />
        <span className="text-danger">Overtime: {formatDuration(overtime)}</span> |{" "}
        <span className="text-success">Saved: {formatDuration(saved)}</span>
      </p>

      <table
        className="table table-sm align-middle"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
          border: "1px solid #dee2e6",
        }}
      >
        <thead className="table-light" style={{ borderBottom: "2px solid #dee2e6" }}>
          <tr>
            <th style={{ width: "20%", border: "1px solid #dee2e6" }}>Task</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Task Status</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Estimated</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Used</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Overtime</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Saved</th>
            <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Start</th>
            <th style={{ width: "10%", border: "1px solid #dee2e6" }}>End</th>
          </tr>
        </thead>

        <tbody>
          {userTaskList.map((t: any) => (
            <tr key={t.id}>
              <td style={{ border: "1px solid #dee2e6", wordBreak: "break-word" }}>{t.title}</td>
              <td>
                <span
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    color: "#fff",
                    backgroundColor: statusMap[t.status]?.bgColor || "#6c757d",
                    display: "inline-block",
                  }}
                >
                  {statusMap[t.status]?.label || t.status}
                </span>
              </td>
              <td style={{ border: "1px solid #dee2e6" }}>
                {formatDuration(t.estimatedTime || 0)}
              </td>
              <td style={{ border: "1px solid #dee2e6" }}>
                {formatDuration(t.userTime || 0)}
              </td>
              <td style={{ border: "1px solid #dee2e6" }} className="text-danger">
                {formatDuration(t.userOvertime || 0)}
              </td>
              <td style={{ border: "1px solid #dee2e6" }} className="text-success">
                {formatDuration(t.userSaved || 0)}
              </td>
              <td style={{ border: "1px solid #dee2e6" }}>{t.startDate || "-"}</td>
              <td style={{ border: "1px solid #dee2e6" }}>{t.endDate || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
})}

    </div>
    </div>

  </>
);

}
