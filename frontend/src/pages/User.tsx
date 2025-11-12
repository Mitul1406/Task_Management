import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../services/api";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "../css/Userpage.css";
import Pagination from "../components/Pagination";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";

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
  const location = useLocation();
  const url = new URLSearchParams(location.search);
  const filterRole = url.get("role");

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "user",
  });
  const [errors, setErrors] = useState<{ username?: string; email?: string }>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loggedInRole, setLoggedInRole] = useState("");

  const usersPerPage = 10;

  // Fetch users
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
    if (filterRole) {
      setRoleFilter(filterRole);
    }
  }, [filterRole]);

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

  // 🔹 Validation
  const validateForm = () => {
    const newErrors: { username?: string; email?: string } = {};

    if (!formData.username.trim()) newErrors.username = "Username is required.";
    if (!formData.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🔹 Handle input + live validation
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Live error removal / correction
    setErrors((prev) => {
      const updated = { ...prev };
      if (name === "username" && value.trim()) delete updated.username;
      if (name === "email") {
        if (value.trim() && /\S+@\S+\.\S+/.test(value)) delete updated.email;
      }
      return updated;
    });
  };

  // 🔹 Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

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
      setErrors({});
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
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
    title: "Are you sure?",
    text: "This action will permanently delete this user.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#6c757d",
    confirmButtonText: "Yes, delete it!",
  });
    if(result.isConfirmed) {
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
    setErrors({});
  };

  // Pagination
  const indexOfLast = currentPage * usersPerPage;
  const indexOfFirst = indexOfLast - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  return (
    <div className="user-page container mt-1">
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
            {loggedInRole === "teamLead" ? (
              <option value="user">Employee</option>
            ) : (
              <>
                <option value="">Select Role</option>
                <option value="user">Employee</option>
                <option value="teamLead">Team Lead</option>
              </>
            )}
          </select>
        </div>
      </div>

      {/* Card + Table */}
      <div className="card shadow-sm border-0 bg-light">
        <div className="card-body">
          {loading ? (
            <p className="d-flex justify-content-center">Loading...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="d-flex justify-content-center">No users found.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
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
                            className="btn btn-sm btn-outline-warning me-2"
                            onClick={() => handleEdit(user)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
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
              <Pagination
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                totalPages={totalPages}
                pageSize={usersPerPage}
                totalResults={users.length}
              />
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
              <h5 className="modal-title">
                {editingUser ? "Edit User" : "Add New User"}
              </h5>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  type="text"
                  name="username"
                  className={`form-control mb-1 ${errors.username ? "is-invalid" : ""}`}
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                />
                {errors.username && (
                  <div className="text-danger mb-2">{errors.username}</div>
                )}

                <input
                  type="email"
                  name="email"
                  className={`form-control mb-1 ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && (
                  <div className="text-danger mb-2">{errors.email}</div>
                )}

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
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading
                    ? editingUser
                      ? "Updating..."
                      : "Adding..."
                    : editingUser
                    ? "Update"
                    : "Add"}
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
