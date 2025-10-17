import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUsers, getUserScreenshots } from "../services/api";

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

export default function ScreenShotView() {
  const params = useParams<{ id: string }>();
  const currentUserId = params.id; // if present, restrict to this user

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId || "");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filteredScreenshots, setFilteredScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date filters
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>("");

  // Fetch all users only if admin (no :id param)
  useEffect(() => {
    if (currentUserId) return; // user view, skip
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id);
      } catch (err) {
        setError("Failed to load users.");
      }
    };
    fetchUsers();
  }, [currentUserId, selectedUserId]);

  // Fetch screenshots
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchScreenshots = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserScreenshots(selectedUserId);
        setScreenshots(data || []);
      } catch (err) {
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

  return (
    <div className="container mt-4">
      <h3 className="mb-3">User Screenshots</h3>

      {/* Filters */}
      <div className="mb-4 d-flex flex-wrap align-items-center gap-3">
        {/* User dropdown only for admin */}
        {!currentUserId && users.length > 0 && (
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
      </div>

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
              <div className="card h-100">
                <img
                  src={`http://localhost:4040${shot.url}`}
                  alt={`Screenshot ${shot.id}`}
                  className="card-img-top"
                  style={{ maxHeight: "200px", objectFit: "cover", cursor: "pointer" }}
                  onClick={() => openModal(`http://localhost:4040${shot.url}`)}
                />
                <div className="card-body p-2 text-center">
                  <small className="text-muted">
                    {new Date(shot.createdAt).toLocaleString()}
                  </small>
                  {/* <div className="mt-2">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => openModal(`http://localhost:4040${shot.url}`)}
                    >
                      View Full Photo
                    </button>
                  </div> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
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
    </div>
  );
}
