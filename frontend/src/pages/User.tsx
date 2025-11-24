import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, deleteUser,getEmpData } from "../services/api";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "../css/Userpage.css";
import Pagination from "../components/Pagination";
import { useLocation, useNavigate } from "react-router-dom";
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
  const navigate=useNavigate()
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
      const token:any=localStorage.getItem("token")
      const decode:any=jwtDecode(token)
      const data = decode.role==="teamLead"?await getEmpData(decode.id):await getUsers();
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

  const validateForm = () => {
    const newErrors: { username?: string; email?: string } = {};

    if (!formData.username.trim()) newErrors.username = "Username is required.";
    if (formData.username.length>50) newErrors.username = "Username cannot exceed 50 characters";
    if (!formData.email.trim()) newErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Invalid email format.";
    else if(formData.email.length>50) newErrors.email = "Email cannot exceed 50 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData((prev) => ({ ...prev, [name]: value }));

  setErrors((prev) => {
    const updated = { ...prev };

    if (name === "username") {
      if (!value.trim()) {
        updated.username = "Username is required";
      }else if(value.length>50){
         updated.username="Username cannot exceed 50 characters"
      } else {
        delete updated.username;
      }
    }

    if (name === "email") {
      if (!value.trim()) {
        updated.email = "Email is required";
      } else if (!/\S+@\S+\.\S+/.test(value)) {
        updated.email = "Invalid email format";
      }else if(value.length>50){
          updated.email = "Email cannot exceed 50 characters";
      } else {
        delete updated.email;
      }
    }

    return updated;
  });
};


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
    customClass:{
      popup:"main-color"
    }
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
    <div className="user-page container-fluid mt-1 main-color">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div><h2>Users</h2>
        <p>Manage all users here — create new users, update users, view users, and remove users when needed.</p>
        </div>
        <button className="btn common-btn-out" onClick={() => setShowModal(true)}>
          + Add User
        </button>
      </div>

      {/* Filters */}
      <div className="filters row mb-3">
        <div className="col-md-3 mb-3">
          <label className="form-label fw-normal">Search Here:</label>
          <input
            type="text"
            placeholder="Search by username..."
            className="form-control"
            value={search}
            maxLength={30}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="col-md-3 mb-3">
          <label className="form-label fw-normal">Filter by Roles:</label>
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
      <div className="card shadow-sm border-0 main-color">
        <div className="card-body">
          {loading ? (
            <p className="d-flex justify-content-center">Loading...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="d-flex justify-content-center">No users found.</p>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle second-color table-border" >
                  <thead>
                    <tr>
                      <th className="fw-500">Username</th>
                      <th className="fw-500">Email</th>
                      <th className="fw-500">Role</th>
                      <th className="fw-500" style={{ width: "150px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentUsers.map((user) => (
                      <tr key={user.id} onClick={()=>navigate("/userData?userId="+user.id+"&username="+user.username)} style={{cursor:"pointer"}}>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>{user.role === "user" ? "Employee" : "Team Lead"}</td>
                        <td>
                          <button
                            className="btn btn-sm report-btn me-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(user)}}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(user.id)}}
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
        <div className="modal-dialog modal-dialog-centered " role="document">
          <div className="modal-content main-color">
            <div className="modal-header justify-content-center">
              <h3 className="modal-title">
                {editingUser ? "Edit User" : "Add New User"}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <input
                  type="text"
                  name="username"
                  className={`form-control mb-1 ${errors.username ? "is-invalid" : ""}`}
                  placeholder="Username"
                  value={formData.username}
                  maxLength={50}
                  onChange={handleChange}
                />
                {errors.username && (
                  <div className="text-danger mb-2">{errors.username}</div>
                )}

                <input
                  type="input"
                  name="email"
                  className={`form-control mb-1 ${errors.email ? "is-invalid" : ""}`}
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  maxLength={50}
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
                  className="btn cancel-btn"
                  onClick={handleCancel}
                >
                  Cancel
                </button>
                <button type="submit" className="btn common-btn-in" disabled={loading}>
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
