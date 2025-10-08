import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api"; 
import {jwtDecode} from "jwt-decode";
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
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const navigateTo = (role: string) => {
    if (role === "admin") navigate("/admin");
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
          localStorage.removeItem("token");
          return;
        }
        navigateTo(decoded.role);
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(form.email, form.password);
      if (!user) throw new Error("Login failed");
      if (user.token) {
        localStorage.setItem("token", user.token);
        toast.success(user.message);
        navigateTo(user.role);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="text-center mb-4">Welcome Back</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
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
            <label htmlFor="password" className="form-label">
              Password
            </label>
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

          <button type="submit" className="btn btn-primary w-100 py-2">
            Login
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
