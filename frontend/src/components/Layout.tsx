import React, { useState } from "react";
import Header from "./Header";
import Sidebar from "./SideBar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="d-flex main-color">
      <Sidebar onToggle={setCollapsed} />

      <div
        style={{
          marginLeft: collapsed ? "20px" : "210px",
          width: collapsed ? "calc(100% - 70px)" : "calc(100% - 210px)",
        //   transition: "all 0.2s ease",
        }}
      >
        <Header collapse={collapsed} />
        <div className="container-fluid mt-1" style={{marginLeft:collapsed?"50px":"0px"}}>{children}</div>
      </div>
    </div>
  );
};

export default Layout;
