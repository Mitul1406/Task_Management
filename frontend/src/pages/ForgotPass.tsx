import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";

const ForgotPass: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
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
        else navigate("/user");
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, [navigate]);
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Please enter your email");

    try {
      setLoading(true);
      const res = await forgotPassword(email);
      toast.success(res.message);
      setEmail(""); 

      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 className="text-center mb-4">Forgot Password</h3>
        <form onSubmit={handleForgotPassword}>
          <div className="mb-3">
            <label>Email Address</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your registered email"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {/* Back to Login */}
        <div className="text-center mt-3">
          <button
            className="btn btn-link p-0"
            onClick={() => navigate("/login")}
            disabled={loading}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPass;
