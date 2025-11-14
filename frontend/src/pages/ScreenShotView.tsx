import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { getUsers, getUserScreenshots } from "../services/api";
import { toast } from "react-toastify";
import Pagination from "../components/Pagination";
import Swal from "sweetalert2";

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
  role: "projectManager" | "teamLead" | "superAdmin" | "user";
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
  const [userRole, setUserRole] = useState<"projectManager" | "teamLead" | "superAdmin" | "user">("user");
  const [selectMode, setSelectMode] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

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

  useEffect(() => {
    if (currentUserId) return;
    if (!["teamLead", "superAdmin"].includes(userRole)) return;

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

  // Filter screenshots by date
  useEffect(() => {
    if (!startDate && !endDate) {
      setFilteredScreenshots(screenshots);
      setCurrentPage(1);
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
    setCurrentPage(1);
  }, [screenshots, startDate, endDate]);

  // Reset pagination when user changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedUserId]);

  // Pagination logic
  const totalPages = Math.ceil(filteredScreenshots.length / itemsPerPage);
  const paginatedScreenshots = filteredScreenshots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const openModal = (url: string) => {
    setCurrentImage(url);
    setModalOpen(true);
  };
  const closeModal = () => {
    setCurrentImage("");
    setModalOpen(false);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedScreenshots([]);
  };
  const toggleSelectScreenshot = (id: string) => {
    setSelectedScreenshots((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const confirmDelete = (ids: string[]) => {
  if (ids.length === 0) return;

  Swal.fire({
    title: 'Are you sure?',
    text: `You are about to delete ${ids.length} screenshot${ids.length > 1 ? "s" : ""}. This action cannot be undone!`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, delete!',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
  }).then((result) => {
    if (result.isConfirmed) {
      deleteScreenshots(ids);
    }
  });
};


  const deleteScreenshots = async (ids: string[]) => {
    if (!["projectManager", "teamLead", "superAdmin"].includes(userRole) || ids.length === 0)
      return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/screenshots`, {
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
      <h3 className="mb-3">Employee Screenshots</h3>

      {/* Filters */}
      <div className="mb-4 d-flex flex-wrap align-items-center gap-3 position-relative">
        {!currentUserId &&
          ["teamLead", "projectManager", "superAdmin"].includes(userRole) &&
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

        {["superAdmin"].includes(userRole) && filteredScreenshots.length !== 0 && (
          <button
            className="btn btn-outline-primary ms-auto position-absolute"
            style={{ top: "0", right: "0" }}
            onClick={toggleSelectMode}
          >
            {selectMode ? "Exit Select Mode" : "Select Screenshots"}
          </button>
        )}
      </div>

      {/* Bulk Delete */}
      {selectMode && (
        <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
          <button
            className="btn btn-outline-success"
            style={{ minWidth: "120px" }}
            onClick={() => {
              if (selectedScreenshots.length === filteredScreenshots.length) {
                setSelectedScreenshots([]);
              } else {
                setSelectedScreenshots(filteredScreenshots.map((s) => s.id));
              }
            }}
          >
            {selectedScreenshots.length === filteredScreenshots.length
              ? "Unselect All"
              : "Select All"}
          </button>

          <button
            className="btn btn-danger"
            style={{ minWidth: "180px" }}
            disabled={selectedScreenshots.length === 0}
            onClick={() => confirmDelete(selectedScreenshots)}
          >
            Delete Selected ({selectedScreenshots.length})
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setSelectedScreenshots([])}
            disabled={selectedScreenshots.length === 0}
          >
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
        <>
          <div className="row">
            {paginatedScreenshots.map((shot) => (
              <div key={shot.id} className="col-12 col-md-4 mb-3">
                <div className="card h-100 position-relative">
                  {selectMode && ["superAdmin"].includes(userRole) && (
                    <input
                      type="checkbox"
                      className="position-absolute top-0 start-0 m-2"
                      checked={selectedScreenshots.includes(shot.id)}
                      onChange={() => toggleSelectScreenshot(shot.id)}
                    />
                  )}
                  <img
                    src={`${process.env.REACT_APP_BACKEND_URL}${shot.url}`}
                    alt={`Screenshot ${shot.id}`}
                    className="card-img-top"
                    style={{ maxHeight: "200px", objectFit: "cover", cursor: "pointer" }}
                    onClick={() =>
                      openModal(`${process.env.REACT_APP_BACKEND_URL}${shot.url}`)
                    }
                  />
                  {!selectMode && ["superAdmin"].includes(userRole) && (
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

          {/* Pagination Controls */}
          {filteredScreenshots.length > itemsPerPage && (
  <Pagination
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    pageSize={itemsPerPage}
    totalResults={(screenshots.length)}
  />
)}
        </>
      )}

      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(6px)",
            zIndex: 1050,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              background: "#fff",
              borderRadius: "10px",
              padding: "10px",
              maxWidth: "90vw",
              maxHeight: "90vh",
              boxShadow: "0 5px 25px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "rgba(0,0,0,0.6)",
                color: "#fff",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontSize: "18px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <img
              src={currentImage}
              alt="Screenshot"
              style={{
                maxWidth: "85vw",
                maxHeight: "85vh",
                objectFit: "contain",
                borderRadius: "8px",
                display: "block",
                margin: "auto",
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
