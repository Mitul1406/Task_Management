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
import AdminDashboard from "../pages/AdminDashboard";
import { useSidebar } from "../context/SideBarContext";
import { RxDashboard } from "react-icons/rx";

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
  const { activePath, setActivePath } = useSidebar();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode<User>(token);
      setRole(decoded.role);
      setID(decoded.id)
    }
  }, []);

useEffect(() => {
  const current = location.pathname;

  let sidebarPaths: string[] = [];
  if (role === "superAdmin") sidebarPaths = superAdminLinks.map(l => l.path);
  else if (role === "teamLead") sidebarPaths = teamLeadLinks.map(l => l.path);
  else if (role === "user") sidebarPaths = userLinks.map(l => l.path);

  const isInSidebar = sidebarPaths.includes(current);

  if (isInSidebar) {
    setActivePath(current);
    localStorage.setItem("activeMenu", current);
  }

}, [location.pathname, role, setActivePath]);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
    onToggle(!collapsed);
  };

  const superAdminLinks = [
    { label: "Dashboard", icon: <RxDashboard />, path: "/superAdmin" },
    { label: "Users", icon: <FaUsers />, path: "/userView" },
    // { label: "View User Timesheet", icon: <FaClock />, path: "/alluser-timesheet-report" },
    // { label: "View User Screenshot", icon: <FaCamera />, path: "/screenshots" },
    { label: "Projects", icon: <FaTasks />, path: "/projects" },
    // { label: "Task", icon: <FaTasks />, path: "/tasks" },
  ];

  const teamLeadLinks = [
    { label: "Dashboard", icon: <RxDashboard />, path: "/admin" },
    { label: "My Task", icon: <FaTasks />, path: "/tlTask" },
    { label: "Users", icon: <FaUsers />, path: "/userView" },
    // { label: "Project Task", icon: <FaTasks />, path: "/admin" },
    // { label: "View User Timesheet", icon: <FaClock />, path: "/alluser-timesheet-report" },
    // { label: "View User Screenshot", icon: <FaCamera />, path: "/screenshots" },
    { label: "Projects", icon: <FaTasks />, path: "/projectsTl" },
    // { label: "Task", icon: <FaTasks />, path: "/taskTls" },
    
  ];

  const userLinks = [
    { label: "Dashboard", icon: <RxDashboard />, path: "/user" },
    { label: "My Tasks", icon: <FaTasks />, path: "/empTask" },
    { label: "My Timesheet", icon: <FaClock />, path: "/user-timesheet-report/"+id },
    // { label: "View Screenshot", icon: <FaCamera />, path: "/screenshots/"+id },
  ];

const isActive = (linkPath: string) => {  
  return activePath === linkPath;
};

  let linksToRender: any[] = [];
  if (role === "superAdmin") linksToRender = superAdminLinks;
  else if (role === "teamLead") linksToRender = teamLeadLinks;
  else if (role === "user") linksToRender = userLinks;

  return (
    <div className={`sidebar d-flex flex-column ${collapsed ? "collapsed" : ""}`}>
  {/* Header */}
  <div
    className="header d-flex align-items-center"
    style={{
      justifyContent: collapsed ? "center" : "space-between",
      minWidth: collapsed ? "0" : "210px",
    }}
  >
    {!collapsed && <h5 className="m-0 ms-4">Task Tracker</h5>}

    <div
      onClick={toggleSidebar}
      className="toggle-btn"
      title={collapsed ? "Expand" : "Collapse"}
    >
      <FaBars />
    </div>
  </div>

  {/* Scrollable Menu */}
  <div style={{ flex: 1 }}>
    <ul className="nav flex-column mb-auto">
      {linksToRender.map((link) => (
        <li key={link.path} className="nav-item mb-1">
          <button
            className={`w-100 d-flex align-items-center sidebar-btn ${
              isActive(link.path) ? "btn-active" : ""
            }`}
            style={{ justifyContent: collapsed ? "center" : "" }}
            onClick={() => {
              setActivePath(link.path);
              navigate(link.path);
            }}
            title={collapsed ? link.label : ""}
          >
            {/* Inner Capsule */}
            <div className="inner d-flex align-items-center">
              <span className="icon-span">{link.icon}</span>

              {!collapsed && <span>{link.label}</span>}

              {collapsed && (
                <span className="tooltip-float">{link.label}</span>
              )}
            </div>
          </button>
        </li>
      ))}
    </ul>
  </div>
</div>

  );
};

export default Sidebar;
