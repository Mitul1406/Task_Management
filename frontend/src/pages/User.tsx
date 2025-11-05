import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../services/api";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "../css/Userpage.css";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface DecodedUser {
  role: string;
}

const UserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loggedInRole, setLoggedInRole] = useState("");

  const usersPerPage = 8;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode<DecodedUser>(token);
      setLoggedInRole(decoded.role);
    }
  }, []);

  useEffect(() => {
    let result = users;
    if (search.trim()) {
      result = result.filter((u) =>
        u.username.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [search, roleFilter, users]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingUser) {
        const res = await updateUser({ ...formData, id: editingUser.id });
        toast.success(res.message || "User updated successfully");
      } else {
        const res = await createUser(formData);
        toast.success(res.message || "User created successfully");
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ username: "", email: "", role: "user" });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        toast.success("User deleted successfully");
        fetchUsers();
      } catch {
        toast.error("Failed to delete user");
      }
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ username: "", email: "", role: "user" });
  };

  // Pagination
  const indexOfLast = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="user-page container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Users</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

      {/* Filters */}
<div className="filters row mb-3">
  <div className="col-md-3 mb-3">
    <label className="form-label fw-bold">Search Here:</label>
    <input
      type="text"
      placeholder="Search by username..."
      className="form-control"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>

  <div className="col-md-3 mb-3">
    <label className="form-label fw-bold">Filter by Roles:</label>
    <select
      className="form-select"
      value={roleFilter}
      onChange={(e) => setRoleFilter(e.target.value)}
    >
      <option value="">All Roles</option>
      <option value="user">Employee</option>
      <option value="teamLead">Team Lead</option>
    </select>
  </div>
</div>

      {/* Card + Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <p className="d-flex justify-content-center">Loading...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="d-flex justify-content-center">No users found.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th style={{ width: "150px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.role === "user" ? "Employee" : "Team Lead"}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-warning me-2"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(user.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="pagination-container">
                <button
                  className="btn btn-light"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-light"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bootstrap Modal */}
      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex={-1}
        role="dialog"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header justify-content-center">
              <h5 className="modal-title ">
                {editingUser ? "Edit User" : "Add New User"}
              </h5>
              {/* <button
                type="button"
                className="btn-close"
                onClick={handleCancel}
              ></button> */}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  type="text"
                  name="username"
                  className="form-control mb-3"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
                <input
                  type="email"
                  name="email"
                  className="form-control mb-3"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <select
                  name="role"
                  className="form-select mb-3"
                  value={formData.role}
                  onChange={handleChange}
                >
                  {loggedInRole === "teamLead" ? (
                    <option value="user">Employee</option>
                  ) : (
                    <>
                      <option value="user">Employee</option>
                      <option value="teamLead">Team Lead</option>
                    </>
                  )}
                </select>
              </div>
              <div className="modal-footer justify-content-between">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
