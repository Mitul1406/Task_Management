import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  FaTachometerAlt,
  FaUsers,
  FaClock,
  FaCamera,
  FaTasks,
  FaBars,
} from "react-icons/fa";
import "../css/SideBar.css";

interface User {
  role: string;
  id:string;
}

interface SidebarProps {
  onToggle: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onToggle }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState("");
  const [id, setID] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode<User>(token);
      setRole(decoded.role);
      setID(decoded.id)
    }
  }, []);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    onToggle(!collapsed);
  };

  const superAdminLinks = [
    { label: "Dashboard", icon: <FaTachometerAlt />, path: "/superAdmin" },
    { label: "Users", icon: <FaUsers />, path: "/userView" },
    { label: "View User Timesheet", icon: <FaClock />, path: "/alluser-timesheet-report" },
    { label: "View User Screenshot", icon: <FaCamera />, path: "/screenshots" },
    { label: "Projects", icon: <FaTasks />, path: "/projects" },
    // { label: "Task", icon: <FaCamera />, path: "/screenshots" },
  ];

  const teamLeadLinks = [
    { label: "Dashboard", icon: <FaTachometerAlt />, path: "/admin" },
    { label: "My Task", icon: <FaTasks />, path: "/tlTask" },
    { label: "Users", icon: <FaUsers />, path: "/userView" },
    // { label: "Project Task", icon: <FaTasks />, path: "/admin" },
    { label: "View User Timesheet", icon: <FaClock />, path: "/alluser-timesheet-report" },
    { label: "View User Screenshot", icon: <FaCamera />, path: "/screenshots" },
    { label: "Projects", icon: <FaTasks />, path: "/projectsTl" },
    
  ];

  const userLinks = [
    { label: "Dashboard", icon: <FaTachometerAlt />, path: "/user" },
    { label: "My Tasks", icon: <FaTasks />, path: "/empTask" },
    { label: "My Timesheet", icon: <FaClock />, path: "/user-timesheet-report/"+id },
    { label: "View Screenshot", icon: <FaCamera />, path: "/screenshots/"+id },
  ];

  let linksToRender: any[] = [];
  if (role === "superAdmin") linksToRender = superAdminLinks;
  else if (role === "teamLead") linksToRender = teamLeadLinks;
  else if (role === "user") linksToRender = userLinks;

  return (
    <div className={`sidebar d-flex flex-column ${collapsed ? "collapsed" : ""}`}>
      <div className="d-flex align-items-center p-3" style={{justifyContent:collapsed ? "center":"space-between"}}>
        {!collapsed && <h5 className="m-0 ms-4">Task Tracker</h5>}
        <div
          onClick={toggleSidebar}
          style={{ cursor: "pointer", fontSize: "1.2rem" }}
        >
          <FaBars title={collapsed ? "Expand" : "Collapse"} />
        </div>
      </div>

      <ul className="nav flex-column mb-auto">
        {linksToRender.map((link) => (
          <li key={link.path} className="nav-item">
            <button
              className={`w-100 text-start d-flex align-items-center px-3 py-2 sidebar-btn ${
                location.pathname === link.path ? "btn-active" : ""
              }`}
              style={{justifyContent:collapsed ? "center":""}}
              onClick={() => navigate(link.path)}
              title={collapsed ? link.label : ""}
            >
              <span className="me-2">{link.icon}</span>
              {!collapsed && <span>{link.label}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
