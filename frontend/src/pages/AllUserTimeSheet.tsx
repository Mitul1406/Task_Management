
import React, { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { getAllTimesheet } from "../services/api";

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

const AllUserTimeSheet: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [showUserTotals, setShowUserTotals] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await getAllTimesheet(startDate, endDate);
        setUsers(res || []);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);
const totalHours = () => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const diffDays =
    Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return diffDays * 8 * 3600; 
};
  const handleDownload = () => {
    if (!pdfRef.current) return;
    html2pdf()
      .from(pdfRef.current)
      .set({
        margin: 5,
        filename: `Timesheet_${startDate}_to_${endDate}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
      })
      .save();
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" />
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
        ) || user.projects?.[0]; // fallback to first project if not found

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

  const seenEstimateKeys = new Set<string>();
  const totalEstimated = allRows.reduce((sum: number, r: any) => {
    const estKey = `${r.assignee}_${r.project}_${r.task}`;
    if (seenEstimateKeys.has(estKey)) return sum;
    seenEstimateKeys.add(estKey);
    return sum + (r.estimated || 0);
  }, 0);

  const totalSpent = allRows.reduce((sum: number, r: any) => sum + (r.spent || 0), 0);
  const totalSaved = totalEstimated - totalSpent;
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
    const estKey = `${r.assignee}_${r.project}_${r.task}`;
    if (!user._estKeys.has(estKey)) {
      user._estKeys.add(estKey);
      user.totalEstimated += r.estimated || 0;
    }
    user.totalSpent += r.spent || 0;
    user.totalSaved += r.saved || 0;
    user.totalOvertime += r.overtime || 0;
  });

  const userSummaryRows = Object.values(userTotals);

  return (
    <div className="container-fluid mt-4 position-relative" style={{ padding: "0px 100px" }}>
      {/* Filter Controls */}
      <div className="d-flex align-items-end gap-3 mb-4" style={{position:"absolute",right:"100px", justifyContent: "flex-end" }}>
        <div>
          <label className="form-label mb-1">Start Date</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label mb-1">End Date</label>
          <input
            type="date"
            className="form-control form-control-sm"
            min={startDate}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={handleDownload}>
          📄 Download PDF
        </button>
      </div>

      {/* PDF Content */}
      <div ref={pdfRef}>
        <h4 className="fw-bold text-left mb-2">
          Timesheet Summary </h4>
          <div><p>
        Date Range: <strong>{startDate}</strong> to{' '}
        <strong>{endDate}</strong>
      </p></div>
        

        <div className="row mb-4">
          {/* Overall Totals */}
          <div className="col-md-5 mb-3">
            <div className="card p-4 shadow-sm border-0 h-100">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Overall Totals</h5>
                <button
                  className="btn btn-sm btn-outline-primary"
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
                <li style={{marginBottom:"1rem"}} className="text-danger"><strong>Total Overtime:</strong> {formatTime(totalOvertime)}</li>
              </ul>
              <p className="text-muted small mb-0">Summary for all users combined</p>
            </div>
          </div>

          {/* User Totals */}
          {showUserTotals && (
            <div className="col-md-7 mb-3">
              <div className="card p-4 shadow-sm border-0 h-100">
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
                          <li className="text-danger mt-1"><strong>Overtime:</strong> {formatTime(u.totalOvertime)}</li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Table */}
        <div className="table-responsive">
          <table
            className="table table-bordered table-sm align-middle text-left"
            style={{ border: "1px solid #000", fontSize: "13px", minWidth: "1100px" }}
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
                <th>Overtime</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
  {allRows.length > 0 ? (
    [...allRows]
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
      </div>
    </div>
  );
};

export default AllUserTimeSheet;
