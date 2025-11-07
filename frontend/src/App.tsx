// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css"
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
import Layout from "./components/Layout";
import SuperAdminProject from "./components/superAdmin/Projects";
import SuperAdminTask from "./components/superAdmin/Task";
import ProjectTl from "./components/teamLead/ProjectTl";
import TaskTl from "./components/teamLead/TaskTl";
import TlTask from "./components/teamLead/TlTask";
import TaskEmp from "./components/Employee/TaskEmp";
import Dashboard from "./components/superAdmin/Dashboard";
import DashboardTl from "./components/teamLead/DashboardTl";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["teamLead"]}>
                <Layout>
                <DashboardTl />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/screenshots"
            element={
              <ProtectedRoute allowedRoles={["teamLead", "superAdmin"]}>
                <Layout>
                <ScreenShotView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/screenshots/:id"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <Layout>
                <ScreenShotView />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <Layout>
                <UserDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
             path="/project-report/:projectId"
             element={
              <ProtectedRoute allowedRoles={["teamLead", "superAdmin"]}> 
              {/* <Layout>           */}
             <Report />
             {/* </Layout> */}
             </ProtectedRoute>
             }
          />
          <Route
             path="/userView"
             element={
             <ProtectedRoute allowedRoles={["teamLead", "superAdmin"]}>
              <Layout>
             <User />
             </Layout>
             </ProtectedRoute>
             }
          />
          <Route
             path="/timesheet-report/:projectId"
             element={
             <ProtectedRoute allowedRoles={["teamLead", "superAdmin"]}>
              {/* <Layout> */}
             <TimeSheet />
             {/* </Layout> */}
             </ProtectedRoute>
             }
          />
          <Route
             path="/alluser-timesheet-report"
             element={
             <ProtectedRoute allowedRoles={["teamLead", "superAdmin"]}>
             <Layout>
             <AllUserTimeSheet />
             </Layout>
             {/* <ExampleTimeAdmin/> */}
             </ProtectedRoute>
             }
          />
          <Route
             path="/user-timesheet-report/:id"
             element={
             <ProtectedRoute allowedRoles={["user"]}>
              <Layout>
             <UserTimeSheet />
             </Layout>
             </ProtectedRoute>
             }
          />

          <Route
            path="/superAdmin"
            element={
              <ProtectedRoute allowedRoles={["superAdmin"]}>
                <Layout>
                <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* superadmin */}
          <Route path="/projects" element={
            <ProtectedRoute allowedRoles={["superAdmin"]}>
                <Layout>
            <SuperAdminProject />
            </Layout>
            </ProtectedRoute>
            } />
          <Route path="/tasks" element={
            <ProtectedRoute allowedRoles={["superAdmin"]}>
                <Layout>
            <SuperAdminTask />
            </Layout>
            </ProtectedRoute>
            } />
          {/* TeamLead */}
          <Route path="/projectsTl" element={
            <ProtectedRoute allowedRoles={["teamLead"]}>
            <Layout>
            <ProjectTl />
            </Layout>
            </ProtectedRoute>
            } />
          <Route path="/taskTls" element={
            <ProtectedRoute allowedRoles={["teamLead"]}>
                <Layout>
            <TaskTl />
            </Layout>
            </ProtectedRoute>
            } />
          <Route path="/tlTask" element={
            <ProtectedRoute allowedRoles={["teamLead"]}>
                <Layout>
            <TlTask />
            </Layout>
            </ProtectedRoute>
            } />
          <Route path="/empTask" element={
            <ProtectedRoute allowedRoles={["user"]}>
                <Layout>
            <TaskEmp />
            </Layout>
            </ProtectedRoute>
            } />

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
<ToastContainer
  position="top-right"
  autoClose={4000}
  hideProgressBar={false}
  newestOnTop={false}
  closeOnClick
  draggable
  toastClassName="toast-item"
  className="toast-container"
  progressClassName="toast-progress"
  closeButton={false}
/>

    </>
  );
}

export default App;
