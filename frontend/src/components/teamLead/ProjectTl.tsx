"use client";

import React, { useEffect, useState } from "react";
import { getAdminProjects, createProject, deleteProject } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination"; // ✅ import reusable pagination
import { jwtDecode } from "jwt-decode";
import Swal from "sweetalert2";

interface Project {
  adminId: any;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [id, setId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const token = localStorage.getItem("token");
      if (!token) return;

    const decoded: any = jwtDecode(token);
    setId(decoded.id)
    const res = await getAdminProjects(decoded.id);
    setProjects(res);
  };

  const handleCreateProject = async () => {
    const errors: { name?: string; description?: string } = {};
    if (!newProjectName.trim()) errors.name = "Project name is required";
    if (!newProjectDescription.trim()) errors.description = "Project description is required";

    if (newProjectName.length>50) errors.name = "Project name cannot exceed 50 characters";
    if (newProjectDescription.length>50) errors.description = "Project description cannot exceed 50 characters";
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
    const result = await Swal.fire({
    title: "Are you sure you?",
    text: "This action will permanently delete the Project.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    customClass:{
      popup:"main-color"
    }
  });
    if (!result.isConfirmed) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully!");
  };
  const filteredProjects = projects.filter((p) =>
  p.name.toLowerCase().includes(searchTerm.toLowerCase())
);
  const totalPages = Math.ceil(projects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container mt-4" style={{minHeight:"100vh"}}>
      <div className="d-flex justify-content-between align-items-center mb-3">
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
          maxLength={30}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: "250px" }}
        /></div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 main-color">
              <div className="modal-header justify-content-center">
                <h5 className="modal-title ">Create Project</h5>
              </div>

              <div className="modal-body">
                <div className="mb-2">
                <input
                  type="text"
                  placeholder="Project Name"
                  className="form-control"
                  value={newProjectName}
                  maxLength={50}
                  onChange={(e) => {
      const value = e.target.value;
      setNewProjectName(value);

      if (!value.trim()) {
        setError((prev) => ({ ...prev, name: "Project name is required" }));
      } else if (value.length > 50) {
        setError((prev) => ({ ...prev, name: "Project name cannot exceed 50 characters" }));
      } else {
        setError((prev) => ({ ...prev, name: "" }));
      }
    }}
                />
                {error.name && <small className="text-danger">{error.name}</small>}
                </div>
                <div className="mb-2">
                <input
                  type="text"
                  placeholder="Project Description"
                  className="form-control"
                  maxLength={50}
                  value={newProjectDescription}
                  onChange={(e) => {
      const value = e.target.value;
      setNewProjectDescription(value);

      if (!value.trim()) {
        setError((prev) => ({ ...prev, description: "Description is required" }));
      } else if (value.length > 50) {
        setError((prev) => ({ ...prev, description: "Project description cannot exceed 50 characters" }));
      } else {
        setError((prev) => ({ ...prev, description: "" }));
      }
    }}
                />
                {error.description && (
                  <small className="text-danger">{error.description}</small>
                )}
                </div>
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

      <div className="card p-3 shadow-sm border-0 main-color">
  {paginatedProjects.length === 0 ? (
    <p>No projects found.</p>
  ) : (
    <div className="table-responsive main-color">
      <table className="table table-hover align-middle text-start second-color" style={{border:"1px solid #000",borderRadius:"6px"}}>
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

  <td>
  <div className="d-flex flex-wrap justify-content-start gap-2">
    
    {(project.adminId?.id === id || project.name === "User Created Tasks") ? (
      <>
        <button
          className="btn btn-outline-info btn-sm"
          onClick={() => navigate(`/taskTls?projectId=${project.id}`)}
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
      </>
    ) : (
      <span className="text-muted">Project by Super Admin</span>
    )}

    {/* DELETE only if not shared */}
    {(project.name !== "User Created Tasks" && project.adminId?.id === id) && (
      <button
        className="btn btn-outline-danger btn-sm"
        onClick={() => handleDeleteProject(project.id)}
      >
        Delete
      </button>
    )}
  </div>
</td>


  {/* Delete only when NOT shared project */}
  {/* {(project.name !== "User Created Tasks" && project.adminId?.id === id) && (
    <button
      className="btn btn-outline-danger btn-sm"
      onClick={() => handleDeleteProject(project.id)}
    >
      Delete
    </button>
  )} */}

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
      pageSize={itemsPerPage}
      totalResults={projects.length}
    />
  )}
</div>

    </div>
  );
};

export default ProjectTl;
