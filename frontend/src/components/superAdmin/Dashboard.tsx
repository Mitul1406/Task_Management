import React, { useEffect, useState } from "react";
import { getSuperAdminDashboardCount, getAllTimesheet, getUsers } from "../../services/api";
import Pagination from "../Pagination";
import { FaClock, FaProjectDiagram, FaSpinner, FaTasks, FaUsers } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

interface UserContribution {
  userId: string;
  username: string;
  totalWorkTime: number;
}

interface ProjectContribution {
  projectId: string;
  projectName: string;
  totalProjectWorkTime: number;
  userContributions: UserContribution[];
}

interface DashboardData {
  totalProjects: number;
  totalTasks: number;
  totalUser:number;
    teamLead:number;
    employee:number;
  pendingTasks: number;
  inProgressTasks: number;
  projectContributions: ProjectContribution[];
}

// Types for Timesheet
interface TimesheetRow {
  assignee: string;
  project: string;
  task: string;
  date: string;
  estimated: number;
  spent: number;
  saved: number;
  overtime: number;
  status: string;
}

const Dashboard: React.FC = () => {
  const [filteredTimesheet, setFilteredTimesheet] = useState<TimesheetRow[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTimesheetPage, setCurrentTimesheetPage] = useState(1);
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const dashboardItemsPerPage = 3;
  const timesheetItemsPerPage = 10;
  const [users, setUsers] = useState<any[]>([]);
  const navigate=useNavigate()

  const [selectedUser, setSelectedUser] = useState<string>("");
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
      const fetchUsers = async () => {
        try {
          const data = await getUsers();
          setUsers(data);
        } catch (err) {
          console.error("Failed to load users", err);
        }
      };
      fetchUsers();
    }, []);

  const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};

const formatDate = (val: any) => {
  if (!val) return "";
  const d = new Date(val);
  return d.toISOString().split("T")[0]; 
};

useEffect(() => {
  const fetchAndFilterData = async () => {
    const dashRes = await getSuperAdminDashboardCount();
    setData(dashRes);
    const timesheetRes = await getAllTimesheet(startDate, endDate);

    const allRows: TimesheetRow[] = [];
    timesheetRes.forEach((user: any) => {
      user.projects.forEach((project: any) => {
        project.tasks.forEach((task: any) => {
          allRows.push({
            assignee: user.username,
            project: project.name,
            task: task.title,
            date: formatDate(task.startDate),
            estimated: task.estimatedTime || 0,
            spent: task.time || 0,
            saved: task.savedTime || 0,
            overtime: task.overtime || 0,
            status: task.status,
          });
        });
      });
    });
    
    const filteredRows = allRows.filter((r) => {
      const date = new Date(r.date).getTime();
      const start = startDate ? new Date(startDate).getTime() : -Infinity;
      const end = endDate ? new Date(endDate).getTime() : Infinity;

      return (
        (!selectedUser || r.assignee === users.find(u => u.id === selectedUser)?.username) &&
        (!selectedStatus || r.status === selectedStatus) &&
        date >= start &&
        date <= end
      );
    });
    setFilteredTimesheet(filteredRows);
    setCurrentTimesheetPage(1);
  };

  fetchAndFilterData();
}, [selectedUser, startDate, endDate, selectedStatus, users]);

  if (!data) return <div>Loading...</div>;
  const totalPages = Math.ceil(data.projectContributions.length / dashboardItemsPerPage);
  const startIdx = (currentPage - 1) * dashboardItemsPerPage;
  const paginatedProjects = data.projectContributions.slice(
    startIdx,
    startIdx + dashboardItemsPerPage
  );
  
  const totalTimesheetPages = Math.ceil(filteredTimesheet.length / timesheetItemsPerPage);
  const startTimesheetIdx = (currentTimesheetPage - 1) * timesheetItemsPerPage;
  const paginatedTimesheet = filteredTimesheet.slice(
  startTimesheetIdx,
  startTimesheetIdx + timesheetItemsPerPage
);

  return (
    <div className="container mt-3">
<div className="card p-4 mb-4 shadow-sm border-0 bg-light">
  {/* <h4 className="mb-4 text-dark">l</h4> */}
  <div className="row g-4 text-center">

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/projects")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white rounded">
        <span className="text-success mb-2">
          <FaProjectDiagram size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.totalProjects}</strong>
        <div className="text-secondary">Total Projects</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/tasks")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-primary rounded">
        <span className="text-primary mb-2">
          <FaTasks size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.totalTasks}</strong>
        <div className="text-secondary">Total Tasks</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/tasks?status=pending")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-warning rounded">
        <span className="text-warning mb-2">
          <FaClock size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.pendingTasks}</strong>
        <div className="text-secondary">Pending Tasks</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/tasks?status=in_progress")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-info rounded">
        <span className="text-danger mb-2">
          <FaSpinner size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.inProgressTasks}</strong>
        <div className="text-secondary">In Progress</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/userView")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white border-secondary rounded">
        <span className="text-secondary mb-2">
          <FaUsers size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.totalUser}</strong>
        <div className="text-secondary">Total Users</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/userView?role=teamLead")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white rounded">
        <span className="text-info mb-2">
          <FaUsers size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.teamLead}</strong>
        <div className="text-secondary">Team Leaders</div>
      </div>
    </div>

    <div className="col-md-3 col-sm-6" onClick={()=>navigate("/userView?role=user")} style={{cursor:"pointer"}}>
      <div className="d-flex flex-column justify-content-center align-items-start p-4 shadow-sm bg-white rounded">
        <span className="text-info mb-2">
          <FaUsers size={36} />
        </span>
        <strong className="fs-3 text-dark">{data.employee}</strong>
        <div className="text-secondary">Employees</div>
      </div>
    </div>

  </div>
</div>
<hr className="my-4 border-2 border-primary opacity-25" />

      <div className="card p-3 shadow-sm mb-4 border-0 bg-light">
        <h4 className="mb-3 text-dark">Project Contributions</h4>
        <div className="row g-3">
          {paginatedProjects.map((project) => (
            <div key={project.projectId} className="col-md-4 col-sm-6">
  <div className="card p-3 shadow-sm h-100 border-0" onClick={()=>navigate(`/projects?name=`+project.projectName)} style={{cursor:"pointer"}}>
    <div className="d-flex justify-content-between align-items-center mb-2">
      <h5 className="mb-0 text-dark">{project.projectName}</h5>
      <span className="badge bg-primary">
        {formatDuration(project.totalProjectWorkTime)}
      </span>
    </div>

    <ul className="list-group list-group-flush">
      {project.userContributions.slice(0, 3).map((user) => (
        <li
          key={user.userId}
          className="list-group-item d-flex justify-content-between align-items-center p-2"
        >
          <span>{user.username}</span>
          <span className="fw-semibold text-secondary">
            {formatDuration(user.totalWorkTime)}
          </span>
        </li>
      ))}

      {project.userContributions.length > 3 && (
        <li className="list-group-item text-end text-primary fw-semibold p-1"
            style={{ cursor: "pointer" }}
            onClick={() => {window.open(`project-report/${project.projectId}`,"_blank")}}>
          +{project.userContributions.length - 3} more
        </li>
      )}
    </ul>
  </div>
</div>

          ))}
        </div>

        {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              totalPages={totalPages}
              totalResults={data.projectContributions.length}
              pageSize={dashboardItemsPerPage}
            />
        )}
      </div>
      <hr className="my-4 border-2 border-primary opacity-25" />

      <div className="card p-3 shadow-sm mb-2 border-0 bg-light">
  <div className="mb-3 row g-2 align-items-end">
    <div className="col-md-4 col-sm-6">
      <label className="form-label fw-bold">User</label>
      <select
        className="form-select"
        value={selectedUser}
        onChange={(e) => setSelectedUser(e.target.value)}
      >
        <option value="">All Users</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.username}
          </option>
        ))}
      </select>
    </div>

    <div className="col-md-2 col-sm-6">
  <label className="form-label fw-bold">Status</label>
  <select
    className="form-select"
    value={selectedStatus}
    onChange={(e) => setSelectedStatus(e.target.value)}
  >
    <option value="">All Statuses</option>
    <option value="pending">Pending</option>
    <option value="in_progress">In Progress</option>
    <option value="code_review">Code Review</option>
    <option value="done">Done</option>
  </select>
</div>


    <div className="col-md-3 col-sm-6">
      <label className="form-label fw-bold">Start Date</label>
      <input
        type="date"
        className="form-control"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
      />
    </div>

    <div className="col-md-3 col-sm-6">
      <label className="form-label fw-bold">End Date</label>
      <input
        type="date"
        className="form-control"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
      />
    </div>

    {/* <div className="col-md-2 col-sm-6">
      <button
        className="btn btn-primary w-100"
        onClick={handleFilterTimesheet}
      >
        Filter
      </button>
    </div> */}
  </div>

  <div className="table-responsive py-3">
    <table
      className="table table-hover table-bordered align-middle text-left"
      style={{ border: "1px solid #000", fontSize: "13px"}}
    >
      <thead style={{ backgroundColor: "#1b263b", color: "white" }}>
        <tr>
          <th>Assignee</th>
          <th>Project</th>
          <th>Task</th>
          <th>Date</th>
          <th>Estimated</th>
          <th>Spent</th>
          <th>Saved</th>
          <th>Time Extension</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {paginatedTimesheet.length > 0 ? (
          paginatedTimesheet.map((r, i) => (
            <tr key={i}>
              <td>{r.assignee}</td>
              <td>{r.project}</td>
              <td>{r.task}</td>
              <td>{formatDate(r.date)}</td>
              <td>{formatDuration(r.estimated)}</td>
              <td>{formatDuration(r.spent)}</td>
              <td className="text-success">{formatDuration(r.saved)}</td>
              <td className="text-danger">{formatDuration(r.overtime)}</td>
              <td>
                <span
                  className="badge"
                  style={{
                    backgroundColor: statusMap[r.status]?.bgColor || "#6c757d",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                >
                  {statusMap[r.status]?.label || r.status}
                </span>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={9} className="text-center text-muted py-3">
              No records found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>

  {/* Pagination */}
  {totalTimesheetPages > 1 && (
    <Pagination
      currentPage={currentTimesheetPage}
      onPageChange={setCurrentTimesheetPage}
      totalPages={totalTimesheetPages}
      totalResults={filteredTimesheet.length}
      pageSize={timesheetItemsPerPage}
    />
  )}
      </div>


    </div>
  );
};

export default Dashboard;
