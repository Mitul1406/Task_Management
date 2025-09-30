import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import ProjectDashboard from "./pages/ProjectDashboard";

function App() {
  return (
    <div className="App">
      <h1 className="text-center mt-4">Task Tracker</h1>
      <ProjectDashboard />
    </div>
  );
}

export default App;
