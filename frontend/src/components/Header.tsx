// src/components/Header.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import "../css/Header.css";
import { jwtDecode } from "jwt-decode";
import { changePassword, getUserTeamLead } from "../services/api";
import { FaEye, FaEyeSlash, FaUserCircle } from "react-icons/fa";

interface User {
  role: string;
  username: string;
  id: string;
  teamLeads?:string[]
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
  const [data,setData]=useState<User[]>([])
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const parsed = jwtDecode<User>(token);
      setUsername(parsed.username || "");
      setRole(parsed.role || "");
      setId(parsed.id || "");
      fetchTL(parsed.id) 
    }
  }, []);
  
  const fetchTL=async(id:string)=>{
    const data:any= await getUserTeamLead(id)
    setData(data) 
  }

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
  {/* LEFT: Welcome */}
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

  {/* RIGHT SIDE: Reporting + User Menu */}
  <div className="d-flex align-items-center gap-2">

    {/* Reporting Pills */}
    {role !== "superAdmin" && (
      <span
        className="text-dark"
        style={{ fontSize: "1rem", fontWeight: "500" }}
      >
        Reporting to:{" "}
        {data.map((d: any) => (
          <span
            key={d.id}
            className="me-1 pill"
            style={{ fontSize: "0.7rem", padding: "4px 8px" }}
          >
            {d.username}
          </span>
        ))}
      </span>
    )}

    {/* User Icon Menu */}
    <div className="user-menu ms-3">
      <span className="user-icon">
        <FaUserCircle size={28} />
      </span>

      <div className="user-popup main-color">
        <button onClick={() => setShowPasswordForm(true)}>Change Password</button>
        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>
    </div>

  </div>

  {/* Your existing password modal remains same */}
  {showPasswordForm && (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
      style={{ background: "rgba(0,0,0,0.5)", zIndex: 1050 }}
    >
      <div className="p-4 rounded shadow main-color" style={{ width: "320px" }}>
        {/* ... */}
      </div>
    </div>
  )}
</header>


  );
};

export default Header;
