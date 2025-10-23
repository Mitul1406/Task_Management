// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import Register from "./components/Register";
import Login from "./components/Login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Report from "./pages/Report";
import TimeSheet from "./pages/TimeSheet";
import UserTimeSheet from "./pages/UserTimeSheet";
import AllUserTimeSheet from "./pages/AllUserTimeSheet";
import User from "./pages/User";
// import ExampleTimeAdmin from "./pages/ExampleTimeAdmin";
import OtpVerification from "./components/otp_verification";
import ScreenShotView from "./pages/ScreenShotView";
import ForgotPass from "./pages/ForgotPass";
import ResetPage from "./pages/ResetPage";
import SuperAdminDashboard from "./pages/SuperadminDashboard";

function App() {
  return (
    <>
      
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/screenshots"
            element={
              <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
                <ScreenShotView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/screenshots/:id"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <ScreenShotView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
             path="/project-report/:projectId"
             element={
              <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>           
             <Report />
             </ProtectedRoute>
             }
          />
          <Route
             path="/userView"
             element={
             <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
             <User />
             </ProtectedRoute>
             }
          />
          <Route
             path="/timesheet-report/:projectId"
             element={
             <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
             <TimeSheet />
             </ProtectedRoute>
             }
          />
          <Route
             path="/alluser-timesheet-report"
             element={
             <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
             <AllUserTimeSheet />
             {/* <ExampleTimeAdmin/> */}
             </ProtectedRoute>
             }
          />
          <Route
             path="/user-timesheet-report/:id"
             element={
             <ProtectedRoute allowedRoles={["user"]}>
             <UserTimeSheet />
             </ProtectedRoute>
             }
          />

          <Route
            path="/superAdmin"
            element={
              <ProtectedRoute allowedRoles={["superAdmin"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<Login />} />
          <Route path="/registration" element={<Register />} />
          <Route path="/otp-verification" element={<OtpVerification />} />
          <Route path="/forgot-password" element={<ForgotPass />} />
          <Route path="/reset-password/:token" element={<ResetPage />} />


          <Route
            path="*"
            element={<h2 className="text-center mt-4">Page Not Found</h2>}
          />
        </Routes>
      </Router>

      {/* Toast container */}
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </>
  );
}

export default App;
