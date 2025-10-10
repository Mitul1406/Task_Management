import React, { useEffect, useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { getAllTimesheet } from "../services/api";

const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" },
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" },
  done: { label: "Done", bgColor: "#2bc22bff" },
};

const ExampleTimeAdmin: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setUsers([]);
        const allUsers = await getAllTimesheet(startDate, endDate);
        setUsers(allUsers);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load timesheet data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate]);


  
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

  const handleDownload = () => {
    if (!sheetRef.current) return;
    html2pdf()
      .from(sheetRef.current)
      .set({
        margin: 5,
        filename: `AllUserTimesheet_${new Date().toISOString().split("T")[0]}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
      })
      .save();
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );

  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="position-relative">
      {/* <>{users.map((user) => (
  <div key={user._uniqueKey} className="mb-4 p-3 border rounded-3 shadow-sm">
    <h4 className="text-primary mb-3">
      👤 {user.username} ({user.email})
    </h4>

    {user.projects.length > 0 ? (
      user.projects.map((project: any) => (
        <div key={project._uniqueKey} className="mb-3 ms-3">
          <h5 className="text-success">{project.name}</h5>
          <p className="text-muted">{project.description}</p>

          {project.tasks.length > 0 ? (
            <table className="table table-bordered table-sm mt-2">
              <thead className="table-light">
                <tr>
                  <th>Task Title</th>
                  <th>Status</th>
                  <th>Worked</th>
                  <th>Estimated</th>
                  <th>Saved</th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((task: any) => (
                  <tr key={task._uniqueKey}>
                    <td>{task.title}</td>
                    <td>{task.status}</td>
                    <td>{formatTime(task.time)}</td>
                    <td>{formatTime(task.estimatedTime)}</td>
                    <td>{formatTime(task.savedTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-muted ms-3">No tasks found.</p>
          )}
        </div>
      ))
    ) : (
      <p className="text-danger ms-3">No projects found.</p>
    )}
  </div>
))}
</> */}
      <div
        className="d-flex gap-3"
        style={{ position: "absolute", top: "15px", right: "70px" }}
      >
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
        <button
          className="btn btn-primary align-self-end"
          onClick={handleDownload}
        >
          Download PDF
        </button>
      </div>

      <div className="container py-4" ref={sheetRef}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="fw-bold">All Users Timesheet</h3>
            <p className="text-muted mb-0">
              Date Range: <strong>{startDate}</strong> to{" "}
              <strong>{endDate}</strong>
            </p>
          </div>
        </div>

        {/* === Users === */}
        {users.length === 0 && (
          <div className="text-center text-muted py-5">
            No user timesheet data found
          </div>
        )}

{users.map((user, userIndex) => {
  const userId = user?.id || user?._id || `user-${userIndex}`;
  const projects = user.projects || [];
  const dayWise = user.dayWise || [];

  // === Helper to ensure unique tasks per user ===
  const uniqueTasksMap = new Map();
  projects.forEach((p: any) => {
    (p.tasks || []).forEach((t: any) => {
      if (!uniqueTasksMap.has(t.id)) {
        uniqueTasksMap.set(t.id, t);
      }
    });
  });

  // === Collect latest savedTime per task ===
  const lastTaskMap = new Map();
  dayWise.forEach((d:any) => {
    (d.tasks || []).forEach((t: any) => {
      const prev = lastTaskMap.get(t.taskId);
      if (!prev || new Date(d.date) > new Date(prev.date)) {
        lastTaskMap.set(t.taskId, { ...t, date: d.date });
      }
    });
  });

  // === Calculations ===
  const totalWorked = dayWise.reduce((sum: number, d: any) => sum + (d.time || 0), 0);
const totalEstimated = projects
  .flatMap((p: any) =>
    (p.tasks || []).filter((t: any) => t.userId === userId)
  )
  .reduce((sum: any, t: any) => sum + (t.estimatedTime || 0), 0);

const totalSaved = projects
  .flatMap((p: any) =>
    (p.tasks || []).filter((t: any) => t.userId === userId)
  )
  .reduce((sum: any, t: any) => sum + (t.savedTime || 0), 0);

const totalOvertime = projects
  .flatMap((p: any) =>
    (p.tasks || []).filter((t: any) => t.userId === userId)
  )
  .reduce((sum: any, t: any) => sum + (t.overtime || 0), 0);


  const totalDays = dayWise.length;
  const totalExpectedHours = totalDays * 8 * 3600; // 8 hours/day in seconds

  return (
    <div
      key={`${userId}-${startDate}-${endDate}-${user.username}`}
      className="card shadow-sm mb-5 border border-dark"
    >
      <div
        className="card-header bg-white text-black"
        style={{ borderBottomWidth: "0px" }}
      >
        <h5 className="mb-0">👤 {user.username}</h5>
      </div>

      <div className="card-body">
        {projects.length === 0 && dayWise.length === 0 ? (
          <div className="text-center text-muted py-3">
            No data available for this user
          </div>
        ) : (
          <>
            {/* === Overall Summary === */}
            <div className="mb-4">
              <div className="card p-3 shadow-sm h-100 border border-dark">
                <h5 className="mb-3">Overall Summary</h5>
                <p>
                  <strong>Total Hours (Expected):</strong>{" "}
                  {formatTime(totalExpectedHours)}
                </p>
                <p>
                  <strong>Total Worked Hours:</strong>{" "}
                  {formatTime(totalWorked)}
                </p>
                <p>
                  <strong>Total Estimated:</strong>{" "}
                  {formatTime(totalEstimated)}
                </p>
                <p className="text-danger">
                  <strong>Total Overtime:</strong>{" "}
                  {formatTime(totalOvertime)}
                </p>
                <p className="text-success">
                  <strong>Total Saved:</strong>{" "}
                  {formatTime(totalSaved)}
                </p>
              </div>
            </div>

            {/* === Project Cards === */}
             <div className="row">
              {projects && projects.length > 0 ? (
                projects.map((proj: any, projIndex: number) => {
                  const projId = proj?.id || proj?._id || `proj-${projIndex}`;
                  const projTasks = Array.isArray(proj.tasks)
                    ? proj.tasks
                    : [];
                  const uniqueKey = `${userId}-${projId}-${projIndex}`;

                  return (
                    <div className="col-lg-6 mb-4" key={uniqueKey}>
                      <div className="card border border-dark h-100">
                        <div className="card-header bg-light border-bottom border-dark">
                          <strong>{proj.name || "Untitled Project"}</strong>
                          <div className="text-muted small">
                            {proj.description || "No description"}
                          </div>
                        </div>

                        <div className="card-body p-0">
                          <table
                            className="table table-sm mb-0"
                            style={{
                              border: "1px solid #000",
                              width: "100%",
                              tableLayout: "fixed",
                              borderCollapse: "collapse",
                              fontSize: "13px",
                            }}
                          >
                            <thead style={{ backgroundColor: "#f1f1f1" }}>
                              <tr>
                                <th style={{ border: "1px solid #000", width: "25%" }}>Task</th>
                                <th style={{ border: "1px solid #000", width: "12%" }}>Status</th>
                                <th style={{ border: "1px solid #000", width: "12%" }}>Time</th>
                                <th style={{ border: "1px solid #000", width: "12%" }}>Estimated</th>
                                <th style={{ border: "1px solid #000", width: "12%" }}>Saved</th>
                                <th style={{ border: "1px solid #000", width: "12%" }}>Overtime</th>
                              </tr>
                            </thead>

                            <tbody>
                              {projTasks && projTasks.length > 0 ? (
                                projTasks.map((t: any, tIndex: number) => (
                                  <tr key={`${userId}-${projId}-${t?.id || tIndex}`}>
                                    <td style={{ border: "1px solid #000" }}>
                                      {t.title || "Untitled Task"}
                                    </td>
                                    <td style={{ border: "1px solid #000" }}>
                                      <span
                                        className="badge"
                                        style={{
                                          backgroundColor:
                                            statusMap[t.status]?.bgColor ||
                                            "#6c757d",
                                          color: "#fff",
                                          fontSize: "11px",
                                        }}
                                      >
                                        {statusMap[t.status]?.label ||
                                          t.status}
                                      </span>
                                    </td>
                                    <td style={{ border: "1px solid #000" }}>
                                      {formatTime(t.time)}
                                    </td>
                                    <td style={{ border: "1px solid #000" }}>
                                      {formatTime(t.estimatedTime)}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #000",
                                        color: "green",
                                      }}
                                    >
                                      {formatTime(t.savedTime)}
                                    </td>
                                    <td
                                      style={{
                                        border: "1px solid #000",
                                        color: "red",
                                      }}
                                    >
                                      {formatTime(t.overtime)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td
                                    colSpan={6}
                                    className="text-center text-muted"
                                    style={{ border: "1px solid #000" }}
                                  >
                                    No tasks found
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-12 text-center text-muted">
                  Not worked in any project.
                </div>
              )}
            </div>

            {/* === Date-wise Breakdown === */}
            <div className="card mt-3 border border-dark">
              <div className="card-header bg-light border-bottom border-dark">
                <strong>Date-wise Breakdown</strong>
              </div>
              <div className="card-body p-0">
                <table
                  className="table mb-0"
                  style={{ border: "1px solid #000", fontSize: "14px" }}
                >
                  <thead style={{ backgroundColor: "#f8f9fa" }}>
                    <tr>
                      <th style={{ border: "1px solid #000" }}>Date</th>
                      <th style={{ border: "1px solid #000" }}>Task</th>
                      <th style={{ border: "1px solid #000" }}>Status</th>
                      <th style={{ border: "1px solid #000" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayWise.length > 0 ? (
                      dayWise.map((day: any, dIndex: number) =>
                        day.tasks?.length > 0 ? (
                          day.tasks.map((t: any, tIndex: number) => (
                            <tr
                              key={`${userId}-${day.date}-${t?.id || tIndex}`}
                            >
                              {tIndex === 0 && (
                                <td
                                  rowSpan={day.tasks.length}
                                  style={{
                                    border: "1px solid #000",
                                    verticalAlign: "middle",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {day.date}
                                </td>
                              )}
                              <td style={{ border: "1px solid #000" }}>
                                {t.title}
                              </td>
                              <td style={{ border: "1px solid #000" }}>
                                <span
                                  className="badge"
                                  style={{
                                    backgroundColor:
                                      statusMap[t.status]?.bgColor || "#6c757d",
                                    color: "#fff",
                                    fontSize: "11px",
                                  }}
                                >
                                  {statusMap[t.status]?.label || t.status}
                                </span>
                              </td>
                              <td style={{ border: "1px solid #000" }}>
                                {formatTime(t.time)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr key={`${userId}-${day.date}`}>
                            <td style={{ border: "1px solid #000" }}>
                              {day.date}
                            </td>
                            <td
                              colSpan={3}
                              className="text-center text-muted"
                              style={{ border: "1px solid #000" }}
                            >
                              Not worked
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-center text-muted"
                          style={{ border: "1px solid #000" }}
                        >
                          No data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
})}

      </div>
    </div>
  );
};

export default ExampleTimeAdmin;
