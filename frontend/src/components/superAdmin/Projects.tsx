"use client";

import React, { useEffect, useState } from "react";
import { getProjects, createProject, deleteProject } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

interface Project {
  id: string;
  name: string;
  description?: string;
}

const SuperAdminProject: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [error, setError] = useState<{ name?: string; description?: string }>({});
  const [showModal, setShowModal] = useState(false);
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await getProjects();
    setProjects(res);
  };

  const handleCreateProject = async () => {
    const errors: { name?: string; description?: string } = {};
    if (!newProjectName.trim()) errors.name = "Project name is required";
    if (!newProjectDescription.trim()) errors.description = "Project description is required";
    if (Object.keys(errors).length > 0) {
      setError(errors);
      return;
    }

    const project = await createProject(newProjectName, newProjectDescription);
    setProjects((prev) => [...prev, project]);
    toast.success("Project created successfully!");
    setNewProjectName("");
    setNewProjectDescription("");
    setShowModal(false)
  };

  const handleDeleteProject = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure to delete this project?");
    if (!confirmDelete) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully!");
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="m-0">Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header justify-content-center">
                <h5 className="modal-title ">Create Project</h5>
                {/* <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button> */}
              </div>

              <div className="modal-body">
                <input
                  type="text"
                  placeholder="Project Name"
                  className="form-control mb-2"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
                {error.name && <small className="text-danger">{error.name}</small>}
                <input
                  type="text"
                  placeholder="Project Description"
                  className="form-control mb-2"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                />
                {error.description && (
                  <small className="text-danger">{error.description}</small>
                )}
              </div>

              <div className="modal-footer justify-content-between">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleCreateProject}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Cards */}
      <div className="card p-3 shadow-sm" style={{background:"aliceblue"}}>
      <div className="row">
        {projects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="col-md-4 mb-3">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5>{project.name}</h5>
                  <p>{project.description}</p>
                  
    <h6>Created by:{(project as any).adminId.username}</h6>
                </div>
                <div className="card-footer">
  <div className="row g-2">
    <div className="col-6">
      <button
        className="btn btn-info btn-sm w-100"
        onClick={() => navigate(`/tasks/${project.id}`)}
      >
        View Details
      </button>
    </div>
    
    <div className="col-6">
      <button
        className="btn btn-success btn-sm w-100"
        onClick={() => navigate(`/timesheet-report/${project.id}`)}
      >
        View Timesheet
      </button>
    </div>
    <div className="col-6">
      <button
        className="btn btn-warning btn-sm w-100"
        onClick={() => navigate(`/project-report/${project.id}`)}
      >
        View Report
      </button>
    </div>
    <div className="col-6">
      <button
        className="btn btn-danger btn-sm w-100"
        onClick={() => handleDeleteProject(project.id)}
      >
        Delete
      </button>
    </div>
  </div>
</div>

              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default SuperAdminProject;
