import React, { useState, useEffect } from "react";
import { getTasksByProject, startTimer, stopTimer } from "../services/api";

interface TaskListProps {
  projectId: string;
}

const TaskList: React.FC<TaskListProps> = ({ projectId }) => {
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const data = await getTasksByProject(projectId);
    setTasks(data);
  };

  const handleStart = async (taskId: string) => {
    await startTimer(taskId);
    fetchTasks();
  };

  const handleStop = async (taskId: string) => {
    await stopTimer(taskId);
    fetchTasks();
  };

  return (
    <ul className="list-group mt-2">
      {tasks.map((task) => (
        <li className="list-group-item d-flex justify-content-between align-items-center" key={task.id}>
          {task.title} - Duration: {task.totalDuration || 0} sec
          <div>
            {!task.isRunning ? (
              <button className="btn btn-success btn-sm me-2" onClick={() => handleStart(task.id)}>Start</button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={() => handleStop(task.id)}>Stop</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

export default TaskList;
