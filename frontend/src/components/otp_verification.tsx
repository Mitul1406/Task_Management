import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOtp, resendOtp } from "../services/api";
import { toast } from "react-toastify";
import {jwtDecode} from "jwt-decode";

const OTP_LENGTH = 6;

const OtpVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string };
  const email = state?.email || localStorage.getItem("otpEmail") || "";

  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendLock, setResendLock] = useState(0);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Redirect if token exists
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

  useEffect(() => {
    localStorage.setItem("otpEmail", email);
  }, [email]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendLock > 0) {
      timer = setTimeout(() => setResendLock(resendLock - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendLock]);

  const handleChange = (index: number, value: string) => {
    if (/^\d*$/.test(value)) {
      const newOtp = [...otpValues];
      newOtp[index] = value.slice(-1);
      setOtpValues(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const newOtp = [...otpValues];
      newOtp[index - 1] = "";
      setOtpValues(newOtp);
      inputRefs.current[index - 1]?.focus();
    }
  };

const handleVerify = async () => {
  const otp = otpValues.join("");
  if (otp.length < OTP_LENGTH) return toast.error("Enter complete OTP");

  setVerifyLoading(true);
  try {
    const res = await verifyOtp(email, otp);

    if (res.success) {
      localStorage.setItem("token", res.token);
      localStorage.removeItem("otpEmail");
      toast.success(res.message);
      if (res.user.role === "admin") navigate("/admin");
      else if(res.user.role === "superAdmin") navigate("/superAdmin")
      else navigate("/user");
    } else {
      toast.error(res.message || "OTP verification failed");
    }
  } catch (err: any) {
    console.log("Unexpected error:", err);

    if (err?.graphQLErrors?.length > 0) {
      toast.error(err.graphQLErrors[0].message);
    } else if (err?.networkError) {
      toast.error("Network error, please try again.");
    } else {
      toast.error(err.message || "Verification failed");
    }
  } finally {
    setVerifyLoading(false);
  }
};


  const handleResend = async () => {
    if (resendLock > 0) return;

    setResendLoading(true);
    try {
      const res = await resendOtp(email);
      if (res.success) {
        toast.success(res.message);
        setOtpValues(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        setResendLock(60); // lock resend for 60s
      } else {
        toast.error(res.message || "Failed to resend OTP");
      }
    } catch (err: any) {
      if (err?.graphQLErrors?.length > 0) {
        toast.error(err.graphQLErrors[0].message);
      } else {
        toast.error(err.message || "Failed to resend OTP");
      }
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToLogin = () => {
    localStorage.removeItem("otpEmail");
    navigate("/login");
  };

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="text-center mb-3">OTP Verification</h2>
        <p className="text-center text-muted mb-4">
          Enter the OTP sent to <strong>{email}</strong>
        </p>

        <div className="d-flex justify-content-between mb-3">
          {otpValues.map((val, idx) => (
            <input
              key={idx}
              type="text"
              value={val}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="form-control text-center mx-1"
              style={{ width: "45px", height: "45px", fontSize: "20px" }}
              maxLength={1}
              ref={(el) => {inputRefs.current[idx] = el}}
            />
          ))}
        </div>

        <button
          className="btn btn-primary w-100 py-2 mb-2"
          onClick={handleVerify}
          disabled={verifyLoading}
        >
          {verifyLoading ? "Verifying..." : "Verify OTP"}
        </button>

        <button
          className="btn btn-outline-secondary w-100 py-2"
          onClick={handleResend}
          disabled={resendLock > 0 || resendLoading}
        >
          {resendLock > 0
            ? `Resend OTP in ${resendLock}s`
            : resendLoading
            ? "Resending..."
            : "Resend OTP"}
        </button>

        <div className="text-center mt-3">
          <button className="btn btn-link p-0" onClick={handleBackToLogin}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
