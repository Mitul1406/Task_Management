"use client";
import React, { useEffect, useState } from "react";
import { getTeamLeadDashboardCount, getUserTasks } from "../../services/api";
import { toast } from "react-toastify";
import Pagination from "../Pagination";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FaClock, FaProjectDiagram, FaRegCalendarCheck, FaSpinner, FaTasks } from "react-icons/fa";
import { log } from "console";
import CreateTaskModal from "../CreateTaskModal";
import { useSidebar } from "../../context/SideBarContext";
interface DashboardData {
  totalProjects: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  totalWorkedToday: number;
}
const DashboardTl: React.FC = () => {
  const {activePath,setActivePath} = useSidebar()
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [id,SetId]=useState("")
  const [todayPage, setTodayPage] = useState(1);
  const [yesterdayPage, setYesterdayPage] = useState(1);
  const tasksPerPage = 10;
  const [data, setData] = useState<DashboardData>({
     totalProjects: 0,
  totalTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  totalWorkedToday: 0
  });
  const navigate = useNavigate();
  const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};
  useEffect(() => {
    fetchDashboardData();
    fetchTasks();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
      
      SetId(decoded.id)
      const res = await getTeamLeadDashboardCount(decoded.id);
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await getUserTasks();
      setProjects(res || []);
    } catch (error) {
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const normalizeDate = (val: any) => {
    if (!val) return null;
    const num = Number(val);
    const d = !isNaN(num) ? new Date(num) : new Date(val);
    if (isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  };

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
    setActivePath("/tlTask")
    const url = `/tlTask?taskId=${task.id}`;
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
      <div className="d-flex justify-content-between mb-3 "><h5 className="text-dark fw-bold">{title}</h5>
      <button
          className="btn btn-primary p-1"
          onClick={() => setShowTaskModal(true)}
        >
          Create Your Own Task
        </button></div>
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle text-left" style={{border:"1px solid #000"}}>
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
            pageSize={20}
            totalResults={20}
          />
      )}
      <CreateTaskModal
        show={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        fetchUserTask={fetchTasks}
      />
    </div>
  );

  return (
    <div className="container mt-4">
      <div className="card p-4 mb-4 shadow-sm border-0 bg-light">
        <div className="row g-4 text-center">

          {/* Total Projects */}
          <div
            className="col-md-3 col-sm-6"
            onClick={() => {
              setActivePath("/projectsTl")
              navigate("/projectsTl")}}
            style={{ cursor: "pointer" }}
          >
            <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white rounded">
              <span className="text-success mb-2">
                <FaProjectDiagram size={36} />
              </span>
              <strong className="fs-3 text-dark">{data.totalProjects}</strong>
              <div className="text-secondary">Total Projects</div>
            </div>
          </div>

          {/* Total Tasks */}
          <div
            className="col-md-3 col-sm-6"
            onClick={() => {
              // setActivePath("/taskTls")
              navigate(`/taskTls?user=${id}`)}}
            style={{ cursor: "pointer" }}
          >
            <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-primary rounded">
              <span className="text-primary mb-2">
                <FaTasks size={36} />
              </span>
              <strong className="fs-3 text-dark">{data.totalTasks}</strong>
              <div className="text-secondary">Total Tasks</div>
            </div>
          </div>

          {/* Pending Tasks */}
          <div
            className="col-md-3 col-sm-6"
            onClick={() => {
              // setActivePath("/taskTls")
              navigate(`/taskTls?status=pending&user=${id}`)}}
            style={{ cursor: "pointer" }}
          >
            <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-warning rounded">
              <span className="text-warning mb-2">
                <FaClock size={36} />
              </span>
              <strong className="fs-3 text-dark">{data.pendingTasks}</strong>
              <div className="text-secondary">Pending Tasks</div>
            </div>
          </div>

          {/* In Progress Tasks */}
          <div
            className="col-md-3 col-sm-6"
            onClick={() => {
              // setActivePath("/taskTls")
              navigate(`/taskTls?status=in_progress&user=${id}`)}}
            style={{ cursor: "pointer" }}
          >
            <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-info rounded">
              <span className="text-danger mb-2">
                <FaSpinner size={36} />
              </span>
              <strong className="fs-3 text-dark">{data.inProgressTasks}</strong>
              <div className="text-secondary">In Progress</div>
            </div>
          </div>

          {/* Worked Today */}
          <div className="col-md-3 col-sm-6" style={{ cursor: "default" }}>
            <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-success rounded">
              <span className="text-success mb-2">
                <FaRegCalendarCheck size={36} />
              </span>
              <strong className="fs-3 text-dark">
                {formatDuration(data.totalWorkedToday)}
              </strong>
              <div className="text-secondary">Worked Today</div>
            </div>
          </div>

        </div>
      </div>
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

export default DashboardTl;
