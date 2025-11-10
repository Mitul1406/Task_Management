"use client";

import React, { useEffect, useState } from "react";
import { getProjects, createProject, deleteProject } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination";

interface Project {
  id: string;
  name: string;
  description?: string;
}

const SuperAdminProject: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<{ name?: string; description?: string }>({});
  const [showModal, setShowModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await getProjects();
    setProjects(res);
    setFilteredProjects(res);
  };

  useEffect(() => {
    const filtered = projects.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProjects(filtered);
    setCurrentPage(1);
  }, [searchTerm, projects]);

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
    setShowModal(false);
  };

  const handleDeleteProject = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure to delete this project?");
    if (!confirmDelete) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully!");
  };

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container mt-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <h2 className="m-0">Projects</h2>

        

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>
      <div className="mb-3">
        <label className="fw-bold mb-1">Search By Project Name:</label>
        <input
          type="text"
          className="form-control w-auto"
          placeholder="Search by project name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: "250px" }}
        /></div>

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
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
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

      <div className="card p-3 shadow-sm border-0 bg-light">
        {paginatedProjects.length === 0 ? (
          <p>No projects found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle text-start">
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Description</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="fw-semibold">{project.name}</td>
                    <td>{project.description || "—"}</td>
                    <td>{(project as any).adminId?.username || "Unknown"}</td>
                    <td>
                      <div className="d-flex flex-wrap justify-content-start gap-2">
                        <button
                          className="btn btn-outline-info btn-sm"
                          onClick={() => navigate(`/tasks?projectId=${project.id}`)}
                        >
                          Details
                        </button>
                        <button
                          className="btn btn-outline-success btn-sm"
                          onClick={() =>
                            window.open(`/timesheet-report/${project.id}`, "_blank")
                          }
                        >
                          Timesheet
                        </button>
                        <button
                          className="btn btn-outline-warning btn-sm"
                          onClick={() =>
                            window.open(`/project-report/${project.id}`, "_blank")
                          }
                        >
                          Report
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredProjects.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default SuperAdminProject;
