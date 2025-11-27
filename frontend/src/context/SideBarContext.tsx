import { createContext, useContext, useState } from "react";

const SidebarContext = createContext<any>(null);

export const SidebarProvider = ({ children }:any) => {
  const [activePath, setActivePath] = useState("");  

  return (
    <SidebarContext.Provider value={{ activePath, setActivePath }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
