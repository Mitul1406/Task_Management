import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { getUsers, getUserScreenshots } from "../services/api";
import { toast } from "react-toastify";

interface Screenshot {
  id: string;
  url: string;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  email?: string;
}

interface JwtPayload {
  id: string;
  role: "admin" | "superadmin" | "user";
}

export default function ScreenShotView() {
  const params = useParams<{ id: string }>();
  const currentUserId = params.id;

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId || "");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedScreenshots, setSelectedScreenshots] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<"admin" | "superadmin" | "user">("user");

  const [selectMode, setSelectMode] = useState(false);

  // Date filters
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  // Modal for viewing
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");

  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  // Decode role from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        setUserRole(decoded.role);
      } catch (err) {
        console.error("Invalid token");
      }
    }
  }, []);

  // Fetch users if admin
  useEffect(() => {
    if (currentUserId) return;
    if (!["admin", "superadmin"].includes(userRole)) return;

    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id);
      } catch {
        setError("Failed to load users.");
      }
    };
    fetchUsers();
  }, [currentUserId, selectedUserId, userRole]);

  // Fetch screenshots
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchScreenshots = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserScreenshots(selectedUserId);
        setScreenshots(data || []);
      } catch {
        setError("Failed to load screenshots.");
        setScreenshots([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScreenshots();
  }, [selectedUserId]);

  // Filter by date
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredScreenshots(screenshots);
      return;
    }
    const filtered = screenshots.filter((shot) => {
      const shotDate = new Date(shot.createdAt).setHours(0, 0, 0, 0);
      const start = startDate ? new Date(startDate).setHours(0, 0, 0, 0) : null;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

      if (start && end) return shotDate >= start && shotDate <= end;
      if (start) return shotDate >= start;
      if (end) return shotDate <= end;
      return true;
    });
    setFilteredScreenshots(filtered);
  }, [screenshots, startDate, endDate]);

  const openModal = (url: string) => {
    setCurrentImage(url);
    setModalOpen(true);
  };
  const closeModal = () => {
    setCurrentImage("");
    setModalOpen(false);
  };

  // Select Mode
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedScreenshots([]);
  };
  const toggleSelectScreenshot = (id: string) => {
    setSelectedScreenshots((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Open delete modal
  const confirmDelete = (ids: string[]) => {
    setDeleteIds(ids);
    setDeleteModalOpen(true);
  };

  // Execute delete
  const deleteScreenshots = async (ids: string[]) => {
    if (!["admin", "superadmin"].includes(userRole) || ids.length === 0) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:4040/screenshots", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.deletedCount} screenshot(s) deleted`);
        setScreenshots((prev) => prev.filter((s) => !ids.includes(s.id)));
        setSelectedScreenshots([]);
      } else {
        toast.error(data.error || "Failed to delete screenshots");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setDeleteModalOpen(false);
      setDeleteIds([]);
    }
  };

  return (
    <div className="container mt-4">
      <h3 className="mb-3">User Screenshots</h3>

      {/* Filters */}
      <div className="mb-4 d-flex flex-wrap align-items-center gap-3">
        {!currentUserId &&
          ["admin", "superadmin"].includes(userRole) &&
          users.length > 0 && (
            <div>
              <label className="form-label">Select User</label>
              <select
                className="form-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.email || "Unknown User"}
                  </option>
                ))}
              </select>
            </div>
          )}

        <div>
          <label className="form-label">Start Date</label>
          <input
            type="date"
            className="form-control"
            value={startDate}
            max={today}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (new Date(endDate) < new Date(e.target.value)) setEndDate(e.target.value);
            }}
          />
        </div>

        <div>
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-control"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Toggle Select Mode */}
        {["admin", "superadmin"].includes(userRole) && filteredScreenshots.length !== 0 && (
          <button className="btn btn-outline-primary ms-auto" onClick={toggleSelectMode}>
            {
            ( selectMode ? "Exit Select Mode" : "Select Screenshots")}
          </button>
        )}
      </div>

      {/* Bulk delete */}
      {selectMode && selectedScreenshots.length > 0 && (
        <div className="mb-3">
          <button
            className="btn btn-danger me-2"
            onClick={() => confirmDelete(selectedScreenshots)}
          >
            Delete Selected ({selectedScreenshots.length})
          </button>
          <button className="btn btn-secondary" onClick={() => setSelectedScreenshots([])}>
            Clear Selection
          </button>
        </div>
      )}

      {/* Screenshots */}
      {loading ? (
        <p>Loading screenshots...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : filteredScreenshots.length === 0 ? (
        <p>No screenshots available.</p>
      ) : (
        <div className="row">
          {filteredScreenshots.map((shot) => (
            <div key={shot.id} className="col-12 col-md-4 mb-3">
              <div className="card h-100 position-relative">
                {selectMode && ["admin", "superadmin"].includes(userRole) && (
                  <input
                    type="checkbox"
                    className="position-absolute top-0 start-0 m-2"
                    checked={selectedScreenshots.includes(shot.id)}
                    onChange={() => toggleSelectScreenshot(shot.id)}
                  />
                )}
                <img
                  src={`http://localhost:4040${shot.url}`}
                  alt={`Screenshot ${shot.id}`}
                  className="card-img-top"
                  style={{ maxHeight: "200px", objectFit: "cover", cursor: "pointer" }}
                  onClick={() => openModal(`http://localhost:4040${shot.url}`)}
                />
                {!selectMode && ["admin", "superadmin"].includes(userRole) && (
                  <button
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2"
                    onClick={() => confirmDelete([shot.id])}
                  >
                    🗑️
                  </button>
                )}
                <div className="card-body p-2 text-center">
                  <small className="text-muted">
                    {new Date(shot.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {modalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={closeModal}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Screenshot</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={currentImage}
                  alt="Screenshot"
                  className="img-fluid"
                  style={{ maxHeight: "90vh", width: "100%", objectFit: "contain" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="modal fade show"
          style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setDeleteModalOpen(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setDeleteModalOpen(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete {deleteIds.length} screenshot
                  {deleteIds.length > 1 ? "s" : ""}?
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => deleteScreenshots(deleteIds)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
