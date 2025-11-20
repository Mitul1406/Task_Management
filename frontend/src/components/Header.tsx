// src/components/Header.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../css/Header.css";
import { jwtDecode } from "jwt-decode";
import { changePassword } from "../services/api";
import { FaEye, FaEyeSlash, FaUserCircle } from "react-icons/fa";

interface User {
  role: string;
  username: string;
  id: string;
}

interface HeaderProps {
  collapse: boolean;
}

const Header: React.FC<HeaderProps> = ({ collapse }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [id, setId] = useState<string>("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const parsed = jwtDecode<User>(token);
      setUsername(parsed.username || "");
      setRole(parsed.role || "");
      setId(parsed.id || "");
    }
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("activeMenu");
    toast.success("Logout successfully...");
    navigate("/login");
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await changePassword(id, oldPassword, newPassword);
      if (res.success) {
        toast.success(res.message);
        setOldPassword("");
        setNewPassword("");
        setShowPasswordForm(false);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header
  className="app-header w-100 shadow-sm p-2 d-flex justify-content-between align-items-center"
  style={{ marginLeft: collapse ? "50px" : "0px" }}
>
  {/* Left: Welcome message */}
  <div className="d-flex align-items-center ms-3">
    <h6 className="m-0">
      Welcome{" "}
      {role === "teamLead"
        ? "Team Leader"
        : role === "superAdmin"
        ? "Super Admin"
        : "Employee"}{" "}
      : {username}
    </h6>
  </div>

  {/* Right: User Menu Icon */}
  <div className="user-menu">
    <span className="user-icon">
      <FaUserCircle size={28} />
    </span>

    <div className="user-popup main-color">
      <button onClick={() => setShowPasswordForm(true)}>Change Password</button>
      <button className="logout-btn" onClick={logout}>Logout</button>
    </div>
  </div>

  {/* Password Change Modal */}
  {showPasswordForm && (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
    >
      <div className="p-4 rounded shadow main-color" style={{ width: "320px" }}>
        <h5 className="text-center mb-3">Change Password</h5>
        <form onSubmit={handlePasswordChange}>
          {/* Old Password */}
          <div className="mb-3 position-relative">
            <input
              type={showOld ? "text" : "password"}
              className="form-control pe-5"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <span
              className="position-absolute top-50 end-0 translate-middle-y me-3"
              style={{ cursor: "pointer" }}
              onClick={() => setShowOld(!showOld)}
            >
              {showOld ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          {/* New Password */}
          <div className="mb-3 position-relative">
            <input
              type={showNew ? "text" : "password"}
              className="form-control pe-5"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <span
              className="position-absolute top-50 end-0 translate-middle-y me-3"
              style={{ cursor: "pointer" }}
              onClick={() => setShowNew(!showNew)}
            >
              {showNew ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <div className="d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setOldPassword("");
                setNewPassword("");
                setShowPasswordForm(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
</header>

  );
};

export default Header;
