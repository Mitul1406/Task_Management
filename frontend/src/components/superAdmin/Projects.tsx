"use client";

import React, { useEffect, useState } from "react";
import { getProjects, createProject, deleteProject } from "../../services/api";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import Pagination from "../../components/Pagination";
import Swal from "sweetalert2";

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
   const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const name = queryParams.get("name");

  useEffect(()=>{
    if(name)  
    setSearchTerm(name);
  },[name])
  
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
    title: "Are you sure?",
    text: "This action will permanently delete the Project.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel",
    customClass:{
      popup:"main-color",
      
          cancelButton: "delete-btn", 
          confirmButton: "common-btn-in",
    }
  });
    if (!result.isConfirmed) return;
    await deleteProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    toast.success("Project deleted successfully!");
  };

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="container-fluid mt-4" style={{minHeight:"100vh"}}>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div><h2 className="m-0">Projects</h2>
        <p>Manage everything related to projects — view details, check reports,
  review timesheets.</p></div>
        <button className="btn common-btn-out" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>
      <div className="mb-3">
        <label className="fw-normal mb-1">Search By Project Name:</label>
        <input
          type="text"
          className="form-control w-auto"
          placeholder="Search by project name..."
          value={searchTerm}
          maxLength={30}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ minWidth: "250px" }}
        /></div>

      {showModal && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered ">
            <div className="modal-content border-0 main-color main-color">
              <div className="modal-header justify-content-center">
                <h3 className="modal-title ">Create Project</h3>
              </div>

              <div className="modal-body">
                <div className="mb-2">
                <input
                  type="text"
                  placeholder="Project Name"
                  className="form-control "
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
                {error.name && <small className="text-danger ">{error.name}</small>}
                </div>
                <div className="mb-1">
                <input
                  type="text"
                  maxLength={50}
                  placeholder="Project Description"
                  className="form-control"
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
                )}</div>
              </div>

              <div className="modal-footer justify-content-between">
                <button className="btn cancel-btn" onClick={() => {
                  setNewProjectName("")
                  setNewProjectDescription("")
                  setError({name:"",description:""})
                  setShowModal(false)}}>
                  Cancel
                </button>
                <button className="btn common-btn-in" onClick={handleCreateProject}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card shadow-sm border-0 main-color">
        {paginatedProjects.length === 0 ? (
          <p className="text-center">No projects found.</p>
        ) : (
          <div className="table-responsive second-color" style={{borderRadius:"6px"}}>
            <table className="table table-hover align-middle text-start table-border">
              <thead>
                <tr>
                  <th className="fw-500">Project Name</th>
                  <th className="fw-500">Description</th>
                  <th className="fw-500">Created By</th>
                  <th className="fw-500">Actions</th>
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
                          className="btn details-btn btn-sm"
                          onClick={() => navigate(`/tasks?projectId=${project.id}`)}
                        >
                          Details
                        </button>
                        <button
                          className="btn timesheet-btn btn-sm"
                          onClick={() =>
                            window.open(`/timesheet-report/${project.id}`, "_blank")
                          }
                        >
                          Timesheet
                        </button>
                        <button
                          className="btn report-btn btn-sm"
                          onClick={() =>
                            window.open(`/project-report/${project.id}`, "_blank")
                          }
                        >
                          Report
                        </button>
                        <button
                          className="btn delete-btn btn-sm"
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

        
      </div>
      {filteredProjects.length > itemsPerPage && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={itemsPerPage}
            totalResults={projects.length}
          />
        )}
    </div>
  );
};

export default SuperAdminProject;
