import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import ProjectDashboard from "./pages/ProjectDashboard"; 
import AdminDashboard from "./pages/AdminDashboard";     
import UserDashboard from "./pages/UserDashboard";

function App() {
  return (
    <Router>
      <div className="App">
        <h1 className="text-center mt-4">Task Tracker</h1>
        <Routes>
          {/* <Route path="/" element={<Navigate to="/user" />} /> */}
          <Route path="/user" element={<UserDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          {/* Optional 404 page */}
          <Route path="*" element={<h2 className="text-center mt-4">Page Not Found</h2>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
