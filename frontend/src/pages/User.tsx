import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser } from "../services/api";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

function UserPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateUser({ 
        id: editingUser.id, 
        username: formData.username,
        email: formData.email,
        role: formData.role,});
        toast.success("User updated successfully");
      } else {
        await createUser(formData);
        toast.success("User created successfully");
      }
      setFormData({ username: "", email: "", password: "", role: "user" });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save user");
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: "",
      role: user.role,
    });
  };

  const handleDelete = async (id: string) => {
    
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id);
        toast.success("User deleted successfully");
        fetchUsers();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete user");
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setFormData({ username: "", email: "", password: "", role: "user" });
  };

  return (
    <div className="container mt-4">
      <ToastContainer />
      <h2 className="mb-3 text-center">User Management</h2>

      {/* 🧾 Add/Edit Form */}
      <form onSubmit={handleSubmit} className="border p-3 rounded shadow-sm mb-4">
        <div className="row">
          <div className="col-md-3 mb-3">
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-3 mb-3">
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {!editingUser && (
            <div className="col-md-3 mb-3">
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="col-md-2 mb-3">
            <select
              name="role"
              className="form-select"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="col-md-1 mb-3 d-flex">
            <button type="submit" className="btn btn-primary w-100">
              {editingUser ? "Update" : "Add"}
            </button>
          </div>
        </div>
        {editingUser && (
          <div className="text-end">
            <button
              type="button"
              className="btn btn-secondary btn-sm mt-1"
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </button>
          </div>
        )}
      </form>

      {/* 👥 User Table */}
      <div className="card shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">User List</h5>
          {loading ? (
            <p>Loading users...</p>
          ) : users.length === 0 ? (
            <p>No users found.</p>
          ) : (
            <table className="table table-bordered table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
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
          )}
        </div>
      </div>
    </div>
  );
}

export default UserPage;
