import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { getUserDayWise } from '../services/api';

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

const UserTimeSheet: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const [data, setData] = useState<UserDayWiseResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!userId) return;

        // Initial fetch to find earliest task
        const res = await getUserDayWise(userId, '2000-01-01', '2099-12-31');
        if (!res) throw new Error('No data');

        // Find earliest task startDate
        let earliest = Number.MAX_SAFE_INTEGER;
        res.projects.forEach((proj) => {
          proj.tasks.forEach((task) => {
            const taskDate = parseInt(task.startDate || '0', 10);
            if (taskDate && taskDate < earliest) earliest = taskDate;
          });
        });

        const start =
          earliest !== Number.MAX_SAFE_INTEGER
            ? new Date(earliest).toISOString().split('T')[0]
            : '2025-01-01';
        const end = new Date().toISOString().split('T')[0];

        const finalRes = await getUserDayWise(userId, start, end);

        // Remove duplicate tasks per project
        finalRes?.projects.forEach((proj) => {
          const seen = new Set();
          proj.tasks = proj.tasks.filter((t) => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
          });
        });

        setData(finalRes);
        setStartDate(start);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-danger">{error}</div>;
  if (!data) return <div>No data available</div>;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m
      .toString()
      .padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const renderTasksByProject = (tasks: DayWiseTask[], projects: Project[]) => {
    if (tasks.length === 0) return <div>No tasks worked</div>;

    // Group tasks by project
    const projectTasksMap: Record<string, DayWiseTask[]> = {};
    projects.forEach((proj) => {
      projectTasksMap[proj.name] = [];
    });

    tasks.forEach((t) => {
      const project = projects.find((p) => p.tasks.some((pt) => pt.id === t.taskId));
      if (project) {
        projectTasksMap[project.name].push(t);
      }
    });

    return Object.entries(projectTasksMap).map(([projectName, projTasks]) => {
      if (projTasks.length === 0) return null;
      return (
        <div key={projectName} className="mb-2">
          <strong>{projectName}</strong>
          <table className="table table-sm table-bordered mt-1">
            <thead>
              <tr>
                <th>Task</th>
                <th>Time</th>
                <th>Estimated</th>
                <th>Saved</th>
                <th>Overtime</th>
              </tr>
            </thead>
            <tbody>
              {projTasks.map((t) => (
                <tr key={t.taskId}>
                  <td>{t.title}</td>
                  <td>{formatTime(t.time)}</td>
                  <td>{formatTime(t.estimatedTime)}</td>
                  <td>{formatTime(t.savedTime)}</td>
                  <td>{formatTime(t.overtime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    });
  };

  const handleDownload = () => {
    if (!sheetRef.current) return;
    html2pdf()
      .from(sheetRef.current)
      .set({
        margin: 10,
        filename: `UserTimesheet_${userId}.pdf`,
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      })
      .save();
  };

  return (<>   
   <div className='position-relative'>
    <button className="btn btn-primary mb-3" style={{position:"absolute",right:"60px",top:"10px"}} onClick={handleDownload}>
        Download PDF
      </button></div>
    <div className="container mt-4" ref={sheetRef}>
      <h2>User Timesheet</h2>
      <p>
        Date Range: <strong>{startDate}</strong> to{' '}
        <strong>{new Date().toISOString().split('T')[0]}</strong>
      </p>
      
      <div >
        <table
    style={{
      border: '1px solid black',
      borderCollapse: 'collapse',
      width: '100%',
    }}
  >
    <thead>
      <tr>
        <th style={{ border: '1px solid black', padding: '4px',width:"10%" }}>Date</th>
        <th style={{ border: '1px solid black', padding: '4px' }}>Tasks Worked (Project Wise)</th>
      </tr>
    </thead>
    <tbody>
      {data.dayWise.map((day) => (
        <tr key={day.date}>
          <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
            {day.date}
          </td>
          <td style={{ border: '1px solid black', padding: '10px' }}>
            {data.projects.map((proj) => {
              const projTasks = day.tasks.filter((t) =>
                proj.tasks.some((pt) => pt.id === t.taskId)
              );
              if (projTasks.length === 0) return null;

              return (
                <div key={proj.id} style={{ marginBottom: '10px' }}>
                  <strong>{proj.name}</strong>
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
      <th style={{ border: '1px solid black', padding: '4px', width: '25%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Task</th>
      <th style={{ border: '1px solid black', padding: '4px', width: '15%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Time</th>
      <th style={{ border: '1px solid black', padding: '4px', width: '15%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Estimated</th>
      <th style={{ border: '1px solid black', padding: '4px', width: '15%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Saved</th>
      <th style={{ border: '1px solid black', padding: '4px', width: '15%', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Overtime</th>
    </tr>
  </thead>
  <tbody>
    {projTasks.map((t) => (
      <tr key={t.taskId}>
        <td style={{ border: '1px solid black', padding: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{t.title}</td>
        <td style={{ border: '1px solid black', padding: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{formatTime(t.time)}</td>
        <td style={{ border: '1px solid black', padding: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{formatTime(t.estimatedTime)}</td>
        <td style={{ border: '1px solid black', padding: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{formatTime(t.savedTime)}</td>
        <td style={{ border: '1px solid black', padding: '4px', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{formatTime(t.overtime)}</td>
      </tr>
    ))}
  </tbody>
</table>

                  
                </div>
              );
            })}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
      </div>
    </div>
    </>

  );
};

export default UserTimeSheet;
