import React, { useState } from "react";
import TaskList from "./TaskList";

interface ProjectCardProps {
  project: any;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const [showTasks, setShowTasks] = useState(false);

  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">{project.name}</h5>
        <p className="card-text">{project.description}</p>
        <button
          className="btn btn-primary"
          onClick={() => setShowTasks(!showTasks)}
        >
          {showTasks ? "Hide Tasks" : "Show Tasks"}
        </button>

        {showTasks && <TaskList projectId={project.id} />}
      </div>
    </div>
  );
};

export default ProjectCard;
