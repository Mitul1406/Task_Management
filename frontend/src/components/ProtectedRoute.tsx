import React from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[]; 
}

interface JwtPayload {
  role: string;
  exp?: number;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.info("Please log in to continue.");
      navigate("/login", { replace: true });
      return;
    }

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const now = Date.now() / 1000;

      if (decoded.exp && decoded.exp < now) {
        localStorage.removeItem("token");
        toast.error("Session expired. Please log in.");
        navigate("/login", { replace: true });
        return;
      }

      // ✅ check if user's role is in allowed roles
      if (!allowedRoles.includes(decoded.role)) {
        toast.error("You are not authorized to access this page.");
        navigate("/login", { replace: true });
        return;
      }

      setAuthorized(true);
    } catch (err) {
      localStorage.removeItem("token");
      toast.error("Invalid token. Please log in.");
      navigate("/login", { replace: true });
    }
  }, [allowedRoles, navigate]);

  return authorized ? children : <div className="text-center mt-4">Loading...</div>;
};
