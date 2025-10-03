
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/api"; 
import {jwtDecode} from "jwt-decode";
import { toast } from "react-toastify";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  interface JwtPayload {
  id: string;
  role: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}
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

        if (decoded.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/user");
        }
      } catch (err) {
        console.error("Invalid token:", err);
        localStorage.removeItem("token");
      }
    }
  }, [navigate]);
  const navigateTo = (role:string)=>{
    if (role === "admin") {
        navigate("/admin");
      } else  if(role === "user"){
        navigate("/user");
      }else{
        navigate("/")
      }
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await login(form.email, form.password);
      if (!user) throw new Error("Login failed");
      if (user.token) {
      localStorage.setItem("token", user.token);
      toast.success(user.message)
      navigateTo(user.role)
    }
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="container mt-5 text-center">
      <h2>Login</h2>
      {error && <p className="text-danger">{error}</p>}
      <form onSubmit={handleSubmit} style={{ maxWidth: "400px" }} className="mx-auto text-center">
        <div className="mb-3">
          <label className="form-label">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Password</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="form-control"
            required
          />
        </div>

        <button type="submit" className="btn btn-success w-100">
          Login
        </button>
      </form>
      <p className="mt-3 text-center">
  Want to create account? <Link to="/registration">Register</Link>
</p>

    </div>
  );
};

export default Login;
