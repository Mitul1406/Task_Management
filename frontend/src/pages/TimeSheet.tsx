import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getTasksByProject, getProjects, getDayWiseData } from "../services/api"; 
import html2pdf from "html2pdf.js";
interface Task {
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
interface DayWiseData {
  date: string;
  users: DayWiseUser[];
}
interface DayWiseUser {
  userId: string[];
  time: number;
  status: string;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
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

// After importing everything and existing code...

export default function TimeSheet() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dayWise, setDayWise] = useState<DayWiseData[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

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

        if (projectId && proj) {
          // Load tasks
          const taskList = await getTasksByProject(projectId);
          setTasks(taskList);

          const userIds = taskList
          .map((t: any) => t.assignedUser?.id)
          .filter((id:any): id is string => !!id); 
          if (userIds.length === 0) {
  console.log("No assigned users found for tasks");
  return [];
}
          const startDate = (proj as any).createdAt || new Date();
          const endDate = new Date();

          const dayWiseData = await getDayWiseData({
            projectId,
            userIds,
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
          });

          setDayWise(dayWiseData);
        }
      } catch (err) {
        console.error("Failed to load report:", err);
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [projectId]);

  const handleDownloadPDF = () => {
    if (reportRef.current) {
      const el: any = reportRef.current;
      const opt: any = {
        margin: 0.1,
        filename: `${project?.name}-TimeSheet_report.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };
      html2pdf().set(opt).from(el).save();
    }
  };

  if (loading) return <div>Loading report...</div>;
  if (!project) return <div>Project not found</div>;

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalUsed = tasks.reduce((sum, t) => sum + (t.totalTime || 0), 0);

  // Group by user for summary cards
  const userTasks = tasks.reduce((acc: any, task) => {
    const user = task.assignedUser?.username || "Unassigned";
    if (!acc[user]) acc[user] = [];
    acc[user].push(task);
    return acc;
  }, {});

  return (
    <div className="mt-4 position-relative">
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-primary"
          onClick={handleDownloadPDF}
          style={{ position: "absolute", top: "25px",right:"150px" }}
        >
          📄 Download PDF
        </button>
      </div>

      <div className="container mt-4" ref={reportRef}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="mb-0">{project.name} -Timesheet Report</h2>
            <small className="text-muted">
              Report Period: {formatDate((project as any).createdAt)} → {formatDate(new Date())}
            </small>
          </div>
        </div>

        {project.description && <p className="text-secondary">{project.description}</p>}

        {/* Totals + Worked Users */}
        <div className="row mb-4">
          <div className="col-md-6 mb-3">
            <div className="card p-3 shadow-sm h-100">
              <h5 className="mb-3">Overall Totals</h5>
              <p><strong>Total Estimated:</strong> {formatDuration(totalEstimated)}</p>
              <p><strong>Total Used:</strong> {formatDuration(totalUsed)}</p>
              <p className="text-danger">
                <strong>Total Overtime:</strong>{" "}
                {formatDuration(tasks.reduce((s, t) => s + ((t as any).overtime || 0), 0))}
              </p>
              <p className="text-success">
                <strong>Total Saved:</strong>{" "}
                {formatDuration(tasks.reduce((s, t) => s + ((t as any).savedTime || 0), 0))}
              </p>
            </div>
          </div>

          <div className="col-md-6 mb-3">
            <div className="card p-3 shadow-sm h-100">
              <h5 className="mb-3">Worked Users</h5>
              <ul className="list-group list-group-flush">
                {Array.from(new Set(tasks.map((t: any) => t.assignedUser?.username).filter(Boolean))).map(
                  (username, idx) => (
                    <li key={idx} className="list-group-item">
                      👤 {username}
                    </li>
                  )
                )}
                {tasks.filter((t: any) => !t.assignedUser).length > 0 && (
                  <li className="list-group-item text-muted">Unassigned Tasks Present</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* User Breakdown Cards */}
        {/* <h4 className="mb-3">User Breakdown</h4>
        {Object.entries(userTasks).map(([user, tasks]: any) => {
          const est = tasks.reduce((s: number, t: Task) => s + (t.estimatedTime || 0), 0);
          const used = tasks.reduce((s: number, t: Task) => s + (t.totalTime || 0), 0);
          const overtime = tasks.reduce((s: number, t: Task) => s + ((t as any).overtime || 0), 0);
          const saved = tasks.reduce((s: number, t: Task) => s + ((t as any).savedTime || 0), 0);

          return (
            <div key={user} className="card mb-3 p-3 shadow-sm">
              <h5>{user}</h5>
              <p>
                Estimated: {formatDuration(est)} | Used: {formatDuration(used)} <br />
                <span className="text-danger">Overtime: {formatDuration(overtime)}</span> |{" "}
                <span className="text-success">Saved: {formatDuration(saved)}</span>
              </p>
            </div>
          );
        })} */}

        {/* New Day-wise Table */}
        {/* <h4 className="mb-3 mt-5">Day-wise Report</h4>
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
              <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Date</th>
              <th style={{ width: "20%", border: "1px solid #dee2e6" }}>User</th>
              <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Status</th>
              <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Time</th>
              <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Estimated</th>
              <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Overtime</th>
              <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Saved</th>
            </tr>
          </thead>
          <tbody>
            {dayWise.map((day) =>
              day.users.map((user) => (
                <tr key={`${day.date}-${user.userId}`}>
                  <td style={{ border: "1px solid #dee2e6" }}>{day.date}</td>
                  <td style={{ border: "1px solid #dee2e6" }}>{user.userId}</td>
                  <td style={{ border: "1px solid #dee2e6" }}>{user.status}</td>
                  <td style={{ border: "1px solid #dee2e6" }}>{formatDuration(user.time)}</td>
                  <td style={{ border: "1px solid #dee2e6" }}>{formatDuration(user.estimatedTime)}</td>
                  <td style={{ border: "1px solid #dee2e6" }} className="text-danger">
                    {formatDuration(user.overtime)}
                  </td>
                  <td style={{ border: "1px solid #dee2e6" }} className="text-success">
                    {formatDuration(user.savedTime)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table> */}


        {/* User Breakdown Cards */}
<h4 className="mb-3">User Breakdown</h4>
{Object.entries(userTasks).map(([user, tasks]: any) => {
  const est = tasks.reduce((s: number, t: Task) => s + (t.estimatedTime || 0), 0);
  const used = tasks.reduce((s: number, t: Task) => s + (t.totalTime || 0), 0);
  const overtime = tasks.reduce((s: number, t: Task) => s + ((t as any).overtime || 0), 0);
  const saved = tasks.reduce((s: number, t: Task) => s + ((t as any).savedTime || 0), 0);

  const userDayWise = dayWise
    .map((day) => {

      const userData = day.users.find((u: any) =>
        tasks.some((t: any) => t.assignedUser?.id === u.userId)
      );
      if (!userData) return null;

      const uniqueTasks = Array.from(new Set((userData as any).tasks.map((t: any) => t.title))).map(
        (title) => (userData as any).tasks.find((t: any) => t.title === title)
      );

      return { date: day.date, status: userData.status, time: userData.time, tasks: uniqueTasks };
    })
    .filter(Boolean);

  return (
    <div key={user} className="card mb-3 p-3 shadow-sm">
      <h5>{user}</h5>
      <p>
        Estimated: {formatDuration(est)} | Used: {formatDuration(used)} <br />
        <span className="text-danger">Overtime: {formatDuration(overtime)}</span> |{" "}
        <span className="text-success">Saved: {formatDuration(saved)}</span>
      </p>

      <h6 className="mt-3">Day-wise Report</h6>
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
            <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Date</th>
            <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Status</th>
            <th style={{ width: "12%", border: "1px solid #dee2e6" }}>Total Worked Time</th>
            <th style={{ width: "60%", border: "1px solid #dee2e6" }}>Tasks Worked</th>
          </tr>
        </thead>
        <tbody>
          {userDayWise.map((day: any, idx: number) => {
            const isWorked = day.status === "Worked";
            return (
              <tr key={`${user}-${day.date}-${idx}`}>
                <td style={{ border: "1px solid #dee2e6" }}>{day.date}</td>
                <td style={{ border: "1px solid #dee2e6" }}>{day.status}</td>
                <td style={{ border: "1px solid #dee2e6" }}>{formatDuration(day.time)}</td>
                <td style={{ border: "1px solid #dee2e6" }}>
                  {isWorked && day.tasks?.length > 0 ? (
                    <table
                      className="table table-sm mb-0"
                      style={{ width: "100%", fontSize: "0.8rem",border:"1px solid #dee2e6"}}
                    >
                      <thead>
                        <tr>
                          <th style={{ width: "35%" ,borderRight:"1px solid #dee2e6"}}>Task</th>
                          <th style={{ width: "15%" ,borderRight:"1px solid #dee2e6"}}>Task Status</th>
                          <th style={{ width: "15%" ,borderRight:"1px solid #dee2e6"}}>Time</th>
                          <th style={{ width: "15%" ,borderRight:"1px solid #dee2e6"}}>Estimated</th>
                          <th style={{ width: "15%" ,borderRight:"1px solid #dee2e6"}}>Saved</th>
                          <th style={{ width: "15%" ,borderRight:"1px solid #dee2e6"}}>Overtime</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.tasks.map((task: any, i: number) => (
                          <tr key={i}>
                            <td style={{borderRight:"1px solid #dee2e6"}}>{task.title}</td>
                            <td style={{borderRight:"1px solid #dee2e6"}}><span
    style={{
      padding: "2px 4px",
      borderRadius: "4px",
      color: "#fff",
      backgroundColor: statusMap[(task as any).status]?.bgColor || "#6c757d",
      display: "inline-block",
      // minWidth: "90px",
      textAlign: "center",
    }}
  >
    {statusMap[(task as any).status]?.label || (task as any).status}
  </span></td>
                            <td style={{borderRight:"1px solid #dee2e6"}}>{formatDuration(task.time)}</td>
                            <td style={{borderRight:"1px solid #dee2e6"}}>{formatDuration(task.estimatedTime)}</td>
                            <td style={{borderRight:"1px solid #dee2e6"}} className="text-success">{formatDuration(task.savedTime)}</td>
                            <td style={{borderRight:"1px solid #dee2e6"}} className="text-danger">{formatDuration(task.overtime)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    "No tasks"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
})}

      </div>
    </div>
  );
}

