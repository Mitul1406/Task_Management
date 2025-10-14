import React, { useEffect, useState } from "react";
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

export default function UserScreenshots() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
        if (data.length > 0) setSelectedUserId(data[0].id);
      } catch (err) {
        console.error("Failed to fetch users", err);
        setError("Failed to load users.");
      }
    };
    fetchUsers();
  }, []);

  // Fetch screenshots when selected user changes
  useEffect(() => {
    if (!selectedUserId) return;

    const fetchScreenshots = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getUserScreenshots(selectedUserId);
        setScreenshots(data || []);
      } catch (err) {
        console.error("Failed to fetch screenshots", err);
        setError("Failed to load screenshots.");
        setScreenshots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScreenshots();
  }, [selectedUserId]);

  return (
    <div className="container mt-4">
      <h3 className="mb-3">User Screenshots</h3>

      {/* User dropdown */}
      <div className="mb-4">
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <>
            <label htmlFor="userSelect" className="form-label">
              Select User
            </label>
            <select
              id="userSelect"
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
          </>
        )}
      </div>

      {/* Screenshots grid */}
      {loading ? (
        <p>Loading screenshots...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : screenshots.length === 0 ? (
        <p>No screenshots available for this user.</p>
      ) : (
        <div className="row">
          {screenshots.map((shot) => (
            <div key={shot.id} className="col-12 col-md-4 mb-3">
  <div className="card h-100">
    <img
      src={`http://localhost:4040${shot.url}`}
      alt={`Screenshot ${shot.id}`}
      className="card-img-top"
      style={{ maxHeight: "200px", objectFit: "cover" }}
    />
    <div className="card-body p-2 text-center">
      <small className="text-muted">
        {new Date(shot.createdAt).toLocaleString()}
      </small>
      <div className="mt-2">
        <a
          href={`http://localhost:4040${shot.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-primary"
        >
          View Full Photo
        </a>
      </div>
    </div>
  </div>
</div>

          ))}
        </div>
      )}
    </div>
  );
}
