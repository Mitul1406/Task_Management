"use client";
import React, { useEffect, useState } from "react";
import { getUserTasks } from "../../services/api";
import { toast } from "react-toastify";
import Pagination from "../Pagination";
import { useNavigate } from "react-router-dom";

const DashboardEmp: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [todayPage, setTodayPage] = useState(1);
  const [yesterdayPage, setYesterdayPage] = useState(1);
  const tasksPerPage = 10;

  const navigate = useNavigate();
  const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};
  const fetchTasks = async () => {
    try {
      const res = await getUserTasks();
      console.log("Fetched Tasks:", res);
      setProjects(res || []);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const normalizeDate = (val: any) => {
    if (!val) return null;
    const num = Number(val);
    const d = !isNaN(num) ? new Date(num) : new Date(val);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // ✅ Utility: Compare same day
  const isSameDay = (d1: any, d2: any) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // ✅ Flatten all tasks from all projects
  const allTasks = projects.flatMap((p: any) =>
    (p.tasks || []).map((t: any) => ({
      ...t,
      projectName: p.name,
      projectId: p.id,
    }))
  );

 const todayTasks = allTasks.filter((t: any) => {
  const start = normalizeDate(t.startDate);
  const end = normalizeDate(t.endDate || t.startDate);
  return start && end && today >= start && today <= end;
});

// const yesterdayTasks = allTasks.filter((t: any) => {
//   const start = normalizeDate(t.startDate);
//   const end = normalizeDate(t.endDate || t.startDate);
//   return start && end && yesterday >= start && yesterday <= end;
// });


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

  const openTask = (task: any) => {
    const url = `/empTask?taskId=${task.id}`;
    navigate(url);
  };

  const todayStartIndex = (todayPage - 1) * tasksPerPage;
  const todayPaginated = todayTasks.slice(
    todayStartIndex,
    todayStartIndex + tasksPerPage
  );

//   const yesterdayStartIndex = (yesterdayPage - 1) * tasksPerPage;
//   const yesterdayPaginated = yesterdayTasks.slice(
//     yesterdayStartIndex,
//     yesterdayStartIndex + tasksPerPage
//   );

  const totalTodayPages = Math.ceil(todayTasks.length / tasksPerPage);
//   const totalYesterdayPages = Math.ceil(yesterdayTasks.length / tasksPerPage);

  if (loading) return <p>Loading tasks...</p>;

  const TaskTable = ({ title, data, currentPage, onPageChange, totalPages }: any) => (
    <div className="card shadow-sm p-3 mb-4 border-0 bg-light">
      <h5 className="mb-3 text-dark fw-bold">{title}</h5>
      <div className="table-responsive">
        <table className="table table-hover align-middle text-left">
          <thead style={{ backgroundColor: "#1b263b", color: "white" }}>
            <tr>
              <th>Project</th>
              <th>Task Title</th>
              <th>Estimated</th>
              <th>Spent</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((task: any) => (
                <tr key={task.id}>
                  <td>{task.projectName}</td>
                  <td>{task.title}</td>
                  <td>{formatDuration(task.estimatedTime)}</td>
                  <td>{formatDuration(task.totalTime)}</td>
                  <td>
                    <span
                  className="badge"
                  style={{
                    backgroundColor: statusMap[task.status]?.bgColor || "#6c757d",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                >
                  {statusMap[task.status]?.label || task.status}
                </span>
                  </td>
                  <td>{task.assignedUser?.username || "-"}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-info"
                      onClick={() => openTask(task)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center text-muted py-3">
                  No tasks found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            onPageChange={onPageChange}
            totalPages={totalPages}
          />
      )}
    </div>
  );

  return (
    <div className="container mt-4">
      <TaskTable
        title="Today's Tasks"
        data={todayPaginated}
        currentPage={todayPage}
        onPageChange={setTodayPage}
        totalPages={totalTodayPages}
      />
      {/* <hr />
      <TaskTable
        title="Yesterday's Tasks"
        data={yesterdayPaginated}
        currentPage={yesterdayPage}
        onPageChange={setYesterdayPage}
        totalPages={totalYesterdayPages}
      /> */}
    </div>
  );
};

export default DashboardEmp;
