"use client";

import React, { useEffect, useState } from "react";
import { getAdminProjects, createProject, deleteProject } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination"; // ✅ import reusable pagination
import { jwtDecode } from "jwt-decode";

interface Project {
  id: string;
  name: string;
  description?: string;
}

const ProjectTl: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [error, setError] = useState<{ name?: string; description?: string }>({});
  const [showModal, setShowModal] = useState(false);

  // ✅ pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const token = localStorage.getItem("token");
      if (!token) return;

      const decoded: any = jwtDecode(token);
    const res = await getAdminProjects(decoded.id);
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
    setShowModal(false);
  };

  const handleDeleteProject = async (id: string) => {
    const confirmDelete = window.confirm("Are you sure to delete this project?");
    if (!confirmDelete) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully!");
  };

  // ✅ pagination logic
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = projects.slice(startIndex, startIndex + itemsPerPage);

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

      <div className="card p-3 shadow-sm">
  {paginatedProjects.length === 0 ? (
    <p>No projects found.</p>
  ) : (
    <div className="table-responsive">
      <table className="table table-hover align-middle text-start">
        <thead>
          <tr>
            {/* <th></th> */}
            <th>Project Name</th>
            <th>Description</th>
            {/* <th>Created By</th> */}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {paginatedProjects.map((project, index) => (
            <tr key={project.id}>
              {/* <td>{(currentPage - 1) * itemsPerPage + index + 1}</td> */}
              <td className="fw-semibold">{project.name}</td>
              <td>{project.description || "—"}</td>
              {/* <td>{(project as any).adminId?.username || "Unknown"}</td> */}
              <td>
                <div className="d-flex flex-wrap justify-content-start gap-2">
                  <button
                    className="btn btn-outline-info btn-sm"
                    onClick={() => navigate(`/taskTls/?projectId=${project.id}`)}
                    // ?projectId=${project.id}
                  >
                    Details
                  </button>
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={() => window.open(`/timesheet-report/${project.id}`,"_blank")}
                  >
                    Timesheet
                  </button>
                  <button
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => window.open(`/project-report/${project.id}`, "_blank")}
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

  {/* ✅ Pagination Component */}
  {projects.length > itemsPerPage && (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
    />
  )}
</div>


      {/* Project Cards */}
      {/* <div className="card p-3 shadow-sm" style={{ background: "aliceblue" }}>
        <div className="row">
          {paginatedProjects.length === 0 ? (
            <p>No projects found.</p>
          ) : (
            paginatedProjects.map((project) => (
              <div key={project.id} className="col-md-4 mb-3">
                <div className="card shadow-sm h-100">
                  <div className="card-body">
                    <h5>{project.name}</h5>
                    <p>{project.description}</p>
                    <h6>Created by: {(project as any).adminId?.username || "Unknown"}</h6>
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

        {projects.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div> */}
    </div>
  );
};

export default ProjectTl;
