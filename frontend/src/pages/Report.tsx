import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { getTasksByProject, getProjects } from "../services/api"; 
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


const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600).toString()
    .padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString()
    .padStart(2, '0');
  return `${h}h${m}m${s}s`;
};

export default function Report() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null)
  const formatDate = (val: any) => {
  if (!val) return "";
  // handle case where val is already ISO string like "2025-10-03"
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const n = Number(val);
  if (isNaN(n)) return "";
  return new Date(n).toISOString().split("T")[0];
};
  useEffect(() => {
    const loadReport = async () => {
      try {
        // Get project details
        const allProjects = await getProjects();
        const proj = allProjects.find((p: Project) => p.id === projectId);
        setProject(proj);

        // Get tasks for project
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

  if (loading) return <div>Loading report...</div>;
  if (!project) return <div>Project not found</div>;

  const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalUsed = tasks.reduce((sum, t) => sum + (t.totalTime || 0), 0);

  // Group by user
  const userTasks = tasks.reduce((acc: any, task) => {
    const user = task.assignedUser?.username || "Unassigned";
    if (!acc[user]) acc[user] = [];
    acc[user].push(task);
    return acc;
  }, {});
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
      <div className="d-flex justify-content-end mb-3">
    <button className="btn btn-primary" onClick={handleDownloadPDF} style={{position:"absolute",top:"25px",right:"55px"}}>
      📄 Download PDF
    </button>
  </div>
    <div className="container mt-4" ref={reportRef}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-0">{project.name} - Report</h2>
          <small className="text-muted">
            Report Period:{" "}
            {(project as any).createdAt
              ? formatDate((project as any).createdAt)
              : "-"}{" "}
            → {formatDate(new Date())}
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
              {formatDuration(tasks.reduce((s, t) => s + ((t as any).overtime || 0), 0))}
            </p>
            <p className="text-success">
              <strong>Total Saved:</strong>{" "}
              {formatDuration(tasks.reduce((s, t) => s + ((t as any).savedTime || 0), 0))}
            </p>
          </div>
        </div>

        {/* Worked Users */}
        <div className="col-md-6 mb-3">
          <div className="card p-3 shadow-sm h-100">
            <h5 className="mb-3">Worked Users</h5>
            <ul className="list-group list-group-flush">
              {Array.from(
                new Set(tasks.map((t: any) => t.assignedUser?.username).filter(Boolean))
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
      <h4 className="mb-3">User Breakdown</h4>
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

<table
  className="table table-sm align-middle"
  style={{
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    border: "1px solid #dee2e6",
  }}
>
  <thead
    className="table-light"
    style={{
      borderBottom: "2px solid #dee2e6",
    }}
  >
    <tr>
      <th style={{ width: "15%", border: "1px solid #dee2e6" }}>Task</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Estimated</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Used</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Overtime</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Saved</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>Start</th>
      <th style={{ width: "10%", border: "1px solid #dee2e6" }}>End</th>
    </tr>
  </thead>

  <tbody>
    {tasks.map((t: Task) => (
      <tr key={t.id}>
        <td
          className="text-wrap"
          style={{
            minWidth: "120px",
            whiteSpace: "normal",
            wordBreak: "break-word",
            border: "1px solid #dee2e6",
          }}
        >
          {t.title}
        </td>
        <td style={{ border: "1px solid #dee2e6" }}>
          {formatDuration(t.estimatedTime || 0)}
        </td>
        <td style={{ border: "1px solid #dee2e6" }}>
          {formatDuration(t.totalTime || 0)}
        </td>
        <td style={{ border: "1px solid #dee2e6" }} className="text-danger">
          {formatDuration((t as any).overtime || 0)}
        </td>
        <td style={{ border: "1px solid #dee2e6" }} className="text-success">
          {formatDuration((t as any).savedTime || 0)}
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
