import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./SideBar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex">
      <Sidebar onToggle={setCollapsed} />

      <div
        style={{
          marginLeft: collapsed ? "20px" : "230px",
          width: collapsed ? "calc(100% - 80px)" : "calc(100% - 230px)",
        //   transition: "all 0.2s ease",
        }}
      >
        <Header collapse={collapsed} />
        <div className="container-fluid mt-3" style={{marginLeft:collapsed?"50px":"0px"}}>{children}</div>
      </div>
    </div>
  );
};

export default Layout;
