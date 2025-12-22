import React, { useEffect, useState, useRef, useId } from "react";
import html2pdf from "html2pdf.js";
import { getAllTimesheet, getUsers,getUser } from "../services/api";
import {jwtDecode} from "jwt-decode";
import Pagination from "../components/Pagination";
import { useLocation, useNavigate } from "react-router-dom";

const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
  done: { label: "Done", bgColor: "#2bc22bff" },
};

const formatTime = (seconds: number) => {
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

const getCurrentUserRole = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const decoded: any = jwtDecode(token);
  return decoded.role;
};

const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const decoded: any = jwtDecode(token);
  return decoded.id;
};

const AllUserTimeSheet: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [users, setUsers] = useState<any[]>([]);
  const [users1, setUsers1] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [showUserTotals, setShowUserTotals] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [renderPdf, setRenderPdf] = useState(false);
  const location=useLocation()
  const qp= new URLSearchParams(location.search)
  const userId=qp.get("userId")
  const username=qp.get("username")
  const itemsPerPage = 10; 
  const navigate=useNavigate()
  let totalResults=0;
  let totalPagesCalc=0;
  useEffect(() => {
  if (!userId) return;

  const fetchUser = async () => {
    const data: any = await getOneUser(userId);

    setSelectedUser(userId);
    setSelectedUserName(data.username);
  };

  fetchUser();
}, [userId]);   

  useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const role = getCurrentUserRole();
      let data: any[] = [];

      if (role === "superAdmin") {
        data = await getAllTimesheet(startDate, endDate,userId || undefined);
      } else if (role === "teamLead" ) {
        const adminId = getCurrentUserId();
        if (!adminId) throw new Error("Admin ID not found");
        data = await getAllTimesheet(startDate, endDate, userId || undefined);
      } else {
        throw new Error("Unauthorized role");
      }
      
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [startDate, endDate, selectedUser]);

useEffect(() => {
  setCurrentPage(1);
}, [startDate, endDate, selectedUser]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers1(data);
      } catch (err) {
        console.error("Failed to load users", err);
      }
    };
    fetchUsers();
  }, []);
  useEffect(() => {
  setTotalPages(totalPagesCalc);
  if (currentPage > totalPagesCalc) setCurrentPage(1);
}, [totalResults, totalPagesCalc]);
  
const getOneUser =async(userId:string)=>{
   const data = await getUser(userId)
   return data
}
  const totalHours = () => {
    const start = new Date(startDate);
  const end = new Date(endDate);
  let workDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); 
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }

    return workDays * 8 * 3600; 
  };

  if (loading)
    return (
      <div className="d-flex min-vh-100 justify-content-center">Loading...
      </div>
    );

  if (error) return <div className="text-danger">{error}</div>;

  // Merge and calculate
  const mergedTasks: Record<string, any> = {};

  users.forEach((user: any) => {
    user.dayWise?.forEach((day: any) => {
      day.tasks?.forEach((dt: any) => {
        const proj =
          user.projects?.find((p: any) =>
            p.tasks?.some((t: any) => String(t.id) === String(dt.taskId))
          ) || user.projects?.[0];

        const key = `${user.username}_${proj?.id || "unknown"}_${dt.taskId}_${day.date}`;

        if (!mergedTasks[key]) {
          mergedTasks[key] = {
            assignee: user.username,
            email: user.email,
            project: proj?.name || "Unknown Project",
            task: dt.title,
            estimated: dt.estimatedTime || 0,
            spent: dt.time || 0,
            saved: dt.savedTime || 0,
            overtime: dt.overtime || 0,
            date: day.date,
            status: dt.status,
          };
        } else {
          mergedTasks[key].spent += dt.time || 0;
          mergedTasks[key].saved = dt.savedTime || mergedTasks[key].saved;
          mergedTasks[key].overtime += dt.overtime || 0;
          mergedTasks[key].status = dt.status;
        }
      });
    });
  });

const allRows = Object.values(mergedTasks);
const sortedRows = allRows
  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

const handleDownload = () => {
  setRenderPdf(true);
  setTimeout(() => {
    if (!pdfRef.current) return;

    const opt:any = {
      margin: [2,2,2,2],
      filename: `Timesheet_${startDate}_to_${endDate}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 4,
        useCORS: true,
        logging: false,
        windowWidth: 1000,
        ignoreElements: (el: HTMLElement) => el.classList.contains("no-print")
      },
      jsPDF: {
        unit: "mm",
        format: "a3",
        orientation: "landscape"
      },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] }
    };

    html2pdf().from(pdfRef.current).set(opt).save()
      .finally(() => setRenderPdf(false));
  }, 300);
};
const seenEstimateKeys = new Set<string>();
const totalEstimated = allRows.reduce((sum: number, r: any) => {
  const estKey = `${r.project}_${r.task}`;
  if (seenEstimateKeys.has(estKey)) return sum;
  seenEstimateKeys.add(estKey);
  return sum + (r.estimated || 0);
}, 0);

const totalSpent = allRows.reduce((sum: number, r: any) => sum + (r.spent || 0), 0);
const totalSaved = allRows.reduce((sum: number, r: any) => sum + (r.saved || 0), 0);
const totalOvertime = allRows.reduce((sum: number, r: any) => sum + (r.overtime || 0), 0);

const userTotals: Record<string, any> = {};
allRows.forEach((r: any) => {
  if (!userTotals[r.assignee]) {
    userTotals[r.assignee] = {
      assignee: r.assignee,
      email: r.email,
      totalEstimated: 0,
      totalSpent: 0,
      totalSaved: 0,
      totalOvertime: 0,
      _estKeys: new Set(),
    };
  }

  const user = userTotals[r.assignee];
  const estKey = `${r.project}_${r.task}`;
  if (!user._estKeys.has(estKey)) {
    user._estKeys.add(estKey);
    user.totalEstimated += r.estimated || 0;
  }
  user.totalSpent += r.spent || 0;
  user.totalSaved += r.saved || 0;
  user.totalOvertime += r.overtime || 0;
});

const userSummaryRows = Object.values(userTotals);

 totalResults = allRows.length;
 totalPagesCalc = Math.ceil(totalResults / itemsPerPage);
const startIdx = (currentPage - 1) * itemsPerPage;
const paginatedData = allRows.slice(startIdx, startIdx + itemsPerPage);


const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const userId = e.target.value;
  setSelectedUser(userId);

  const foundUser = users1.find((u: any) => u.id === userId);
  setSelectedUserName(foundUser ? foundUser.username : "");
};
  
const badgeStyle = (status: string) => ({
  backgroundColor: statusMap[status]?.bgColor || "#6c757d",
  fontSize: "12px",
  padding: "5px",
  borderRadius: "3px",
  color: "#fff",
  display: "inline-block",
  minWidth:"85px"
});
  return (
    <div className="container-fluid mt-3" >
      <style>
      {`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}
    </style>
      
      <div>
  <div className="d-flex flex-wrap justify-content-between align-items-start mb-1 gap-3">
    <div>
      <h4 className="fw-bold mb-2">
        Timesheet Summary
        {selectedUserName && (
          <span
            style={{
              fontWeight: 600,
              color: "#0d6efd",
              marginLeft: "8px",
            }}
          >
            — {selectedUserName}
          </span>
        )}
      </h4>

      <div>
          <p>
            Date Range: <strong>{startDate}</strong> to <strong>{endDate}</strong>
          </p>
        </div>
    </div>

    <div className="d-flex flex-wrap align-items-end justify-content-end gap-3 no-print">
      {/* <div style={{ minWidth: "160px" }}>
        <label className="form-label mb-1">User</label>
        <select
          className="form-select form-select-sm"
          value={selectedUser}
          onChange={(e) => handleUserChange(e)}
        >
          <option value="">Select User</option>
          {users1.map((user: any) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div> */}

      <div style={{ minWidth: "140px" }}>
        <label className="form-label mb-1">Start Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div style={{ minWidth: "140px" }}>
        <label className="form-label mb-1">End Date</label>
        <input
          type="date"
          className="form-control form-control-sm"
          min={startDate}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      
      <div>
        <label className="form-label mb-1 d-block">&nbsp;</label>
        <button className="btn status" onClick={handleDownload}>
          📄 Download PDF
        </button>
      </div>
      <div>        
        <button className="btn btn-outline-dark me-2" onClick={()=>navigate(-1)}>{"<"}- Back</button>
      </div>
    </div>
  </div>

        
        <div className="row mb-4">
          <div className="col-md-5 mt-3">
            <div className="card p-4 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Overall Totals</h5>
                <button
                  className="btn btn-sm btn-outline-dark no-print"
                  onClick={() => setShowUserTotals(!showUserTotals)}
                >
                  {showUserTotals ? "Hide User Totals" : "View User Totals"}
                </button>
              </div>
              <ul className="list-unstyled mb-2">
                <li style={{marginBottom:"1rem"}}><strong>Total Hours:</strong> {formatTime(totalHours())}</li>
                <li style={{marginBottom:"1rem"}}><strong>Total Used:</strong> {formatTime(totalSpent)}</li>
                <li style={{marginBottom:"1rem"}}><strong>Total Estimated:</strong> {formatTime(totalEstimated)}</li>
                <li style={{marginBottom:"1rem"}} className="text-success"><strong>Total Saved:</strong> {formatTime(totalSaved)}</li>
                {totalOvertime>0 && <li style={{marginBottom:"1rem"}} className="text-danger"><strong>Total Time Extension:</strong> {formatTime(totalOvertime)}</li>}
              </ul>
              <p className="text-muted small mb-0">Summary for all users combined</p>
            </div>
          </div>

          {showUserTotals && (
            <div className="col-md-7 mt-3">
              <div className="card p-4 shadow-sm h-100">
                <h5 className="fw-bold mb-3">👤 User-wise Totals</h5>
                <div className="row">
                  {userSummaryRows.map((u: any, i: number) => (
                    <div key={i} className="col-md-6 mb-3">
                      <div className="border rounded p-3 bg-light h-100">
                        <h6 className="fw-bold text-dark mb-1">{u.assignee}</h6>
                        <ul className="list-unstyled mb-0 small">
                          <li className="mt-1"><strong>Hours:</strong> {formatTime(totalHours())}</li>
                          <li className="mt-1"><strong>Estimated:</strong> {formatTime(u.totalEstimated)}</li>
                          <li className="mt-1"><strong>Used:</strong> {formatTime(u.totalSpent)}</li>
                          <li className="text-success mt-1"><strong>Saved:</strong> {formatTime(u.totalSaved)}</li>
                          {totalOvertime>0 && <li className="text-danger mt-1"><strong>Time Extension:</strong> {formatTime(u.totalOvertime)}</li>}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="table-responsive">
          <table
            className="table table-bordered table-sm align-middle text-left"
            style={{ border: "1px solid #000", fontSize: "13px", minWidth: "1100px",overflow:"auto" }}
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
              {paginatedData.length > 0 ? (
                [...paginatedData]
                  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((r: any, i: number) => (
                    <tr key={i}>
                      <td>{r.assignee}</td>
                      <td>{r.project}</td>
                      <td>{r.task}</td>
                      <td>{r.date}</td>
                      <td>{formatTime(r.estimated)}</td>
                      <td>{formatTime(r.spent)}</td>
                      <td className="text-success">{formatTime(r.saved)}</td>
                      <td className="text-danger">{formatTime(r.overtime)}</td>
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
            <Pagination
      currentPage={currentPage}
      onPageChange={setCurrentPage}
      totalPages={totalPagesCalc}
      pageSize={itemsPerPage}
      totalResults={allRows.length}
    />   
      </div>
{renderPdf && (
  <div className="pdf-render-container">
    <div ref={pdfRef} className="pdf-content">
      <style>{`
        .pdf-content * { box-sizing: border-box; }

        @page {
          size: A4 landscape;
          margin: 8mm;
        }

        .pdf-header h4 { font-size: 16px; margin-bottom: 4px; }
        .pdf-header .user-name { color: #0d6efd; }
        .info-text { margin: 2px 0; font-size: 11px; }

        .pdf-card {
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 8px 10px;
          background: #fff;
          page-break-inside: avoid;
        }

        .pdf-card ul { list-style: none; padding: 0; margin: 0; font-size: 10.5px; }
        .pdf-card li { margin: 1px 0; }

        .pdf-table-wrapper { margin-top: 10px; overflow-x: auto; }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 10.5px;
        }
        .pdf-table th, .pdf-table td { border: 1px solid #000; padding: 3px 2px; word-wrap: break-word; text-align: left; }
        .pdf-table th { background: #1b263b !important; color: white !important; }

        /* Optional: badges small for PDF */
        .pdf-table .badge { font-size: 10px; padding: 2px 4px; min-width: auto; }

        /* Grid for user totals inside PDF */
        .pdf-user-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 6px;
        }
      `}</style>

      {/* Header */}
      <div className="pdf-header">
        <h4>
          Timesheet Summary
          {selectedUserName && <span className="user-name"> — {selectedUserName}</span>}
        </h4>
        <p className="info-text">
          Date Range: <strong>{startDate}</strong> to <strong>{endDate}</strong>
        </p>
      </div>

      {/* Totals */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "8px 0", pageBreakInside: "avoid" }}>
        <div style={{ flex: "1 1 38%", minWidth: "220px" }}>
          <div className="pdf-card">
            <h5>Overall Totals</h5>
            <ul>
              <li><strong>Total Hours:</strong> {formatTime(totalHours())}</li>
              <li><strong>Total Used:</strong> {formatTime(totalSpent)}</li>
              <li><strong>Total Estimated:</strong> {formatTime(totalEstimated)}</li>
              <li className="text-success"><strong>Total Saved:</strong> {formatTime(totalSaved)}</li>
              {totalOvertime > 0 && <li className="text-danger"><strong>Time Extension:</strong> {formatTime(totalOvertime)}</li>}
            </ul>
          </div>
        </div>

        {showUserTotals && (
          <div style={{ flex: "1 1 60%", minWidth: "220px" }}>
            <div className="pdf-card">
              <h5>User-wise Totals</h5>
              <div className="pdf-user-grid">
                {userSummaryRows.map((u, i) => (
                  <div key={i} style={{ border: "1px solid #ddd", borderRadius: "3px", padding: "4px", background: "#f8f9fa" }}>
                    <strong style={{ fontSize: "10px" }}>{u.assignee}</strong>
                    <ul style={{ margin: "2px 0 0", fontSize: "9.5px" }}>
                      <li><strong>Est:</strong> {formatTime(u.totalEstimated)}</li>
                      <li><strong>Used:</strong> {formatTime(u.totalSpent)}</li>
                      <li className="text-success"><strong>Saved:</strong> {formatTime(u.totalSaved)}</li>
                      {u.totalOvertime > 0 && <li className="text-danger"><strong>Ext:</strong> {formatTime(u.totalOvertime)}</li>}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="pdf-table-wrapper">
        <table className="pdf-table">
          <thead>
            <tr>
              {["Assignee", "Project", "Task", "Date", "Est", "Spent", "Saved", "Ext", "Status"].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r, i) => (
              <tr key={i}>
                <td>{r.assignee}</td>
                <td>{r.project}</td>
                <td>{r.task}</td>
                <td>{r.date}</td>
                <td>{formatTime(r.estimated)}</td>
                <td>{formatTime(r.spent)}</td>
                <td className="text-success">{formatTime(r.saved)}</td>
                <td className="text-danger">{formatTime(r.overtime)}</td>
                <td>
                  <span className="badge" style={badgeStyle(r.status)}>{statusMap[r.status]?.label || r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  </div>
)}


    </div>
  );
};

export default AllUserTimeSheet;
