import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resetPassword } from "../services/api";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

const ResetPassword: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
     useEffect(() => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const decoded = jwtDecode<any>(token);
          const now = Date.now() / 1000;
          if (decoded.exp && decoded.exp < now) {
            localStorage.removeItem("token");
            return;
          }
          if (decoded.role === "admin") navigate("/admin");
        else if(decoded.role === "superAdmin") navigate("/superAdmin")
          else navigate("/user");
        } catch {
          localStorage.removeItem("token");
        }
      }
    }, [navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirm) return toast.error("Please fill in all fields");
    if (password !== confirm) return toast.error("Passwords do not match");

    try {
      setLoading(true);
      const res = await resetPassword(token!, password);

      if (!res.success) {
        // Handle invalid/expired token gracefully
        if (res.message.includes("Invalid or expired token")) {
          setIsTokenValid(false);
        }
        toast.error(res.message);
        return;
      }

      toast.success(res.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="card p-4 text-center shadow-lg" style={{ maxWidth: 400 }}>
          <h4 className="text-danger mb-3">Link Expired</h4>
          <p>Your password reset link is invalid or has expired.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/forgot-password")}
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 className="text-center mb-4">Reset Password</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label>New Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
            />
          </div>
          <div className="mb-3">
            <label>Confirm Password</label>
            <input
              type="password"
              className="form-control"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>
          <button type="submit" className="btn btn-success w-100" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
