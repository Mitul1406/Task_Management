import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { getUserDayWise } from '../services/api';
import { jwtDecode } from 'jwt-decode';

interface DayWiseTask {
  taskId: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
}

interface DayWise {
  date: string;
  time: number;
  status: string;
  tasks: DayWiseTask[];
}

interface Task {
  id: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
  startDate?: string;
  endDate?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

interface UserDayWiseResponse {
  projects: Project[];
  dayWise: DayWise[];
}
interface ProjectTotals {
  projectId: string;
  projectName: string;
  totalTime: number;
  totalEstimated: number;
  totalSaved: number;
  totalOvertime: number;
  
}
interface TaskTotals {
  taskId: string;
  title: string;
  totalTime: number;
  totalEstimated: number;
  totalSaved: number;
  totalOvertime: number;
}
interface OverallTotals {
  totalTime: number;
  totalEstimated: number;
  totalSaved: number;
  totalOvertime: number;
  hours:number;
}

const statusMap: Record<string, { label: string; bgColor: string }> = {
  pending: { label: "Pending", bgColor: "#064393ff" },       
  in_progress: { label: "In Progress", bgColor: "#4b0867ff" }, 
  code_review: { label: "Code Review", bgColor: "#a1dcaeff" }, 
  done: { label: "Done", bgColor: "#2bc22bff" },    
};


const UserTimeSheet: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDayWiseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
const today = new Date().toISOString().split("T")[0];
const [startDate, setStartDate] = useState<string>(today);
const [endDate, setEndDate] = useState<string>(today);
const sheetRef = useRef<HTMLDivElement>(null);
const [username,setUsername]=useState("")
useEffect(() => {
  const fetchData = async () => {
    try {
      if (!userId) return;

      setLoading(true);
      const res = await getUserDayWise(userId, startDate, endDate);

      res?.projects.forEach((proj) => {
        const seen = new Set();
        proj.tasks = proj.tasks.filter((t) => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      });

      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [userId, startDate, endDate]);

  useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
          const parsed = jwtDecode<any>(token);
          setUsername(parsed.username || "");
        }
      }, []);
// const calculateProjectTotals = (data: UserDayWiseResponse): ProjectTotals[] => {
//   const totalsMap: Record<string, ProjectTotals> = {};

//   // Initialize totals for each project
//   data.projects.forEach((proj) => {
//     totalsMap[proj.id] = {
//       projectId: proj.id,
//       projectName: proj.name,
//       totalTime: 0,
//       totalEstimated: 0,
//       totalSaved: 0,
//       totalOvertime: 0,
//     };
//   });

//   // Iterate over all dayWise tasks
//   data.dayWise.forEach((day) => {
//     day.tasks.forEach((task) => {
//       // Find which project this task belongs to
//       const project = data.projects.find((proj) =>
//         proj.tasks.some((t) => t.id === task.taskId)
//       );
//       if (!project) return;

//       const projTotal = totalsMap[project.id];
//       projTotal.totalTime += task.time;
//       projTotal.totalEstimated += task.estimatedTime;
//       projTotal.totalSaved += task.savedTime;
//       projTotal.totalOvertime += task.overtime;
//     });
//   });

//   return Object.values(totalsMap);
// };

const calculateOverallTotals = (data: UserDayWiseResponse): OverallTotals => {
  let totalTime = 0;
  let totalSaved = 0;
  let totalOvertime = 0;
  let totalEstimated = 0;

  const countedTaskIds = new Set<string>();

  data.dayWise.forEach((day) => {
    day.tasks.forEach((task) => {
      totalTime += task.time;
      totalSaved += task.savedTime;
      totalOvertime += task.overtime;

      if (!countedTaskIds.has(task.taskId)) {
        countedTaskIds.add(task.taskId);
        totalEstimated += task.estimatedTime;
      }
    });
  });

  const start = new Date(startDate);
  const end = new Date(endDate);
  let workDays = 0;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay(); 
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDays++;
    }
  }
  const hours = (workDays * 8)*3600;

  return { totalTime, totalEstimated, totalSaved, totalOvertime,hours };
};

const calculateProjectTaskTotals = (data: UserDayWiseResponse): ProjectTotals[] => {
  return data.projects.map((proj) => {
    const taskTotalsMap: Record<string, TaskTotals> = {};

    // Initialize task totals with base estimated time
    proj.tasks.forEach((t) => {
      taskTotalsMap[t.id] = {
        taskId: t.id,
        title: t.title,
        totalTime: 0,
        totalEstimated: t.estimatedTime,
        totalSaved: 0,
        totalOvertime: 0,
        status: (t as any).status,
      } as any;
    });

    // Add up all day-wise time and overtime
    data.dayWise.forEach((day) => {
      day.tasks.forEach((task) => {
        const t = taskTotalsMap[task.taskId];
        if (t) {
          t.totalTime += task.time;
          t.totalOvertime += task.overtime;
        }
      });
    });

    // Compute saved time for each task
    Object.values(taskTotalsMap).forEach((t) => {
      t.totalSaved = Math.max(0, t.totalEstimated - t.totalTime);
    });

    // --- 🧮 FIX: derive project totals ---
    const tasks = Object.values(taskTotalsMap);
    const projectTotalEstimated = tasks.reduce((sum, t) => sum + t.totalEstimated, 0);
    const projectTotalTime = tasks.reduce((sum, t) => sum + t.totalTime, 0);
    const projectTotalOvertime = tasks.reduce((sum, t) => sum + t.totalOvertime, 0);

    // ✅ Saved time should be based on remaining total (not sum of individual saves)
    const projectTotalSaved = Math.max(0, projectTotalEstimated - projectTotalTime);

    return {
      projectId: proj.id,
      projectName: proj.name,
      totalEstimated: projectTotalEstimated,
      totalTime: projectTotalTime,
      totalSaved: projectTotalSaved,
      totalOvertime: projectTotalOvertime,
      tasks,
    };
  });
};

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!data) return <div>No data available</div>;
  const projectTotals = calculateProjectTaskTotals(data);
  const overallTotals = data ? calculateOverallTotals(data) : null;
 
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

  const element = sheetRef.current;

  const opt: any = {
    margin: [10, 10, 10, 10], // top, left, bottom, right in mm
    filename: `UserTimesheet_${new Date().toISOString().split("T")[0]}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      scrollY: 0,
      logging: false,
      ignoreElements: (el: HTMLElement) => el.classList.contains("no-print"),
    },
    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
    pagebreak: {
      mode: ["css", "legacy"],
      avoid: ".avoid-page-break",
    },
  };

  setTimeout(() => {
    html2pdf().from(element).set(opt).save();
  }, 100);
};


  return (<>   
   <div className='position-relative'>
    <div style={{position:"absolute",right:"140px"}}>
   <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
    
  {/* <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label htmlFor="startDate" style={{ marginBottom: '4px', fontSize: '2rem' }}>Filter By Dates:</label>
    
</div> */}
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label htmlFor="startDate" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>Start Date</label>
    <input
      id="startDate"
      type="date"
      value={startDate}
      onChange={(e) => setStartDate(e.target.value)}
      style={{
        padding: '6px 10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '0.9rem',
      }}
    />
  </div>
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <label htmlFor="endDate" style={{ marginBottom: '4px', fontSize: '0.9rem' }}>End Date</label>
    <input
      id="endDate"
      type="date"
      min={startDate}
      value={endDate}
      onChange={(e) => setEndDate(e.target.value)}
      style={{
        padding: '6px 10px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '0.9rem',
      }}
    />
  </div>
</div>

</div>
    <button className="btn status mb-3" style={{position:"absolute",right:"00px",top:"20px"}} onClick={handleDownload}>
        Download PDF
      </button></div>
    <div className="container mt-4" ref={sheetRef}>
      <h2>{username} Timesheet</h2>
      <p>
        Date Range: <strong>{startDate}</strong> to{' '}
        <strong>{endDate}</strong>
      </p>
      <div className="row mb-4">
  <div className="col-md-6 mb-3">
    <div className="card p-3 shadow-sm h-100">
      <h5 className="mb-3">Overall Totals</h5>
      <p>
        <strong>Total Hours:</strong> {formatTime(overallTotals?.hours || 0)}
      </p>
      <p>
        <strong>Total Worked Hours:</strong> {formatTime(overallTotals?.totalTime || 0)}
      </p>
      <p>
        <strong>Total Estimated:</strong> {formatTime(overallTotals?.totalEstimated || 0)}
      </p>
      
      <p className="text-success">
        <strong>Total Saved:</strong> {formatTime(overallTotals?.totalSaved || 0)}
      </p>

      {overallTotals!.totalOvertime > 0 && (
  <p className="text-danger">
    <strong>Total Time Extension:</strong>{" "}
    {formatTime(overallTotals?.totalOvertime || 0)}
  </p>
)}

    </div>
  </div>
</div>

<h2 className='mb-3'>
        Date Wise Breakdown
</h2>
<div className="card p-3 shadow-sm mb-4">

<table
  style={{
    border: '1px solid black',
    borderCollapse: 'collapse',
    width: '100%',
  }}
>
  <thead>
    <tr>
      <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>Date</th>
      <th style={{ border: '1px solid black', padding: '4px' }}>Tasks Worked</th>
    </tr>
  </thead>
  <tbody>
    {data.dayWise.map((day) => {
  
  const allTasks = data.projects.flatMap((proj) => {
    const projTasks = day.tasks.filter((t) =>
      proj.tasks.some((pt) => pt.id === t.taskId)
    );
    return projTasks.map((t) => ({
      ...t,
      projectName: proj.name, 
    }));
  });
  
  return (
    <tr key={day.date}>
      <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
        {day.date}
      </td>
      <td style={{ border: '1px solid black', padding: '10px' }}>
        {allTasks.length > 0 ? (
          <table
            style={{
              border: '1px solid black',
              borderCollapse: 'collapse',
              width: '100%',
              tableLayout: 'fixed',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    border: '1px solid black',
                    padding: '4px',
                    width: '20%',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  Project Name
                </th>
                <th
                  style={{
                    border: '1px solid black',
                    padding: '4px',
                    width: '25%',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  Task
                </th>
                <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>
                  Task Status
                </th>
                <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>
                  Time
                </th>
                <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>
                  Estimated
                </th>
                <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>
                  Saved
                </th>
                <th style={{ border: '1px solid black', padding: '4px', width: '15%' }}>
                  Time Extension
                </th>
              </tr>
            </thead>
            <tbody>
              {allTasks.map((t) => (
                <tr key={`${t.projectName}-${t.taskId}`}>
                  <td
                    style={{
                      border: '1px solid black',
                      padding: '4px',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {t.projectName}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px' }}>
                    {t.title}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px' }}>

                    <span
    style={{
      padding: "2px 4px",
      borderRadius: "4px",
      color: "#fff",
      backgroundColor: statusMap[(t as any).status]?.bgColor || "#6c757d",
      display: "inline-block",
      textAlign: "center",
    }}
  >
    {(statusMap[(t as any).status]?.label || (t as any).status) || ("-")}
  </span>
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px' }}>
                    {formatTime(t.time)}
                  </td>
                  <td style={{ border: '1px solid black', padding: '4px' }}>
                    {formatTime(t.estimatedTime)}
                  </td>
                  <td
                    style={{ border: '1px solid black', padding: '4px' }}
                    className="text-success"
                  >
                    {formatTime(t.savedTime)}
                  </td>
                  <td
                    style={{ border: '1px solid black', padding: '4px' }}
                    className="text-danger"
                  >
                    {formatTime(t.overtime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ color: 'gray', fontStyle: 'italic' }}>Not worked</div>
        )}
      </td>
    </tr>
  );
})}

  </tbody>
</table>

      </div>
    </div>
    </>

  );
};

export default UserTimeSheet;
