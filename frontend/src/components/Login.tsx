import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api"; 
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

interface JwtPayload {
  id: string;
  role: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const navigateTo = (role: string) => {
    if (role === "admin") navigate("/admin");
    else if(role === "superAdmin") navigate("/superAdmin")
    else if (role === "user") navigate("/user");
    else navigate("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        const now = Date.now() / 1000;
        if (decoded.exp && decoded.exp < now) {
          console.log(`[Login] Token expired: ${token}`);
          localStorage.removeItem("token");
          return;
        }
        console.log(`[Login] Token valid, redirecting to ${decoded.role} dashboard`);
        navigateTo(decoded.role);
      } catch (err) {
        console.error("[Login] Invalid token", err);
        localStorage.removeItem("token");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log(`[Login] Attempting login for email: ${form.email} at ${new Date().toISOString()}`);
    
    try {
      const user = await login(form.email, form.password);
      console.log("[Login] API Response:", user);

      if (!user) throw new Error("Login failed");

      if (!user.isVerified) {
        toast.info("OTP sent to your email");
        console.log(`[Login] OTP required for email: ${form.email}`);
        
        // Save email for OTP page
        localStorage.setItem("otpEmail", form.email);

        navigate("/otp-verification", { state: { email: form.email } });
        return;
      }

      if (user.token) {
        localStorage.setItem("token", user.token);
        localStorage.removeItem("otpEmail");
        toast.success(user.message);

        console.log(`[Login] Login successful for ${form.email}. Navigating to ${user.role}`);
        navigateTo(user.role);
      }
    } catch (err: any) {
      console.error(`[Login] Error for email ${form.email}:`, err);
      toast.error(err.message || "Login failed"); // <-- show error as toast
    } finally {
      setLoading(false);
      console.log(`[Login] Login attempt finished for ${form.email} at ${new Date().toISOString()}`);
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="text-center mb-4">Welcome Back</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="form-control"
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="mb-3 text-end">
  <Link to="/forgot-password" className="small">
    Forgot Password?
  </Link>
</div>


          <button
            type="submit"
            className="btn btn-primary w-100 py-2"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="text-center mt-3">
          <span className="text-muted">Don't have an account? </span>
          <Link to="/registration">Register</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
