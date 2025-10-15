import { useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";

const SCREENSHOT_INTERVAL = 10 * 1000; // 10 seconds

interface TokenPayload {
  id?: string;
  userId?: string;
}

interface AutoScreenshotProps {
  onPermissionDenied?: () => void;
}

export default function AutoScreenshot({ onPermissionDenied }: AutoScreenshotProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // --- Decode user ID from token ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      setUserId(decoded.id || decoded.userId || null);
    } catch (err) {
      console.error("Invalid token", err);
    }
  }, []);

  // --- Start screen capture ---
  useEffect(() => {
    if (!userId) return;
    requestScreenShare();
  }, [userId]);

  // --- Periodic screenshot capture ---
  useEffect(() => {
    if (!stream || !userId) return;

    const captureInterval = setInterval(() => captureAndUpload(), SCREENSHOT_INTERVAL);
    intervalRef.current = captureInterval;

    return () => {
      clearInterval(captureInterval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream, userId]);

  // --- Ask for screen share ---
  const requestScreenShare = async () => {
    try {
      setStatus("Requesting permission...");

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
      });

      const track = mediaStream.getVideoTracks()[0];
      const settings = track.getSettings() as Partial<MediaTrackSettings> & {
        displaySurface?: "monitor" | "window" | "browser" | "application";
      };

      console.log("Display surface:", settings.displaySurface);

      let isFullScreen = false;

      if (settings.displaySurface) {
        isFullScreen = settings.displaySurface === "monitor";
      } else {
        // Fallback for Firefox/Safari
        const label = track.label?.toLowerCase() || "";
        isFullScreen = label.includes("screen") || label.includes("entire");
      }

      if (!isFullScreen) {
        // ❌ Not entire screen — stop and warn
        setShowWarning(true);
        setStatus("Please share entire screen");
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      // ✅ Entire screen selected
      setStream(mediaStream);
      setStatus("Sharing...");
      setPermissionDenied(false);

      track.onended = () => {
        setStatus("Stopped");
        setPermissionDenied(true);
        clearInterval(intervalRef.current!);
        setStream(null);
      };
    } catch (err) {
      console.error("Permission denied", err);
      setStatus("Permission denied");
      setPermissionDenied(true);
      onPermissionDenied?.();
    }
  };

  // --- Retry permission ---
  const retryPermission = async () => {
    setPermissionDenied(false);
    setShowWarning(false);
    setStatus("Retrying...");
    await requestScreenShare();
  };

  // --- Capture and upload ---
  const captureAndUpload = async () => {
    if (!stream || !userId) return;

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;

    await new Promise<void>((resolve) => {
      video.onloadedmetadata = async () => {
        try {
          await video.play();
        } catch {}
        resolve();
      };
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const formData = new FormData();
      formData.append("screenshot", blob, "screenshot.webp");
      formData.append("userId", userId);

      try {
        const res = await fetch("http://localhost:4040/upload-screenshot", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("Upload failed");
        setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
      } catch (err) {
        console.error("Upload failed", err);
        setStatus("Upload failed");
      }
    }, "image/webp", 0.9);
  };

  return (
    <>
      {/* Status Bar */}
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          fontSize: "12px",
          zIndex: 1050,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          backgroundColor: "rgba(255,255,255,0.9)",
          padding: "6px 8px",
          borderRadius: "4px",
          boxShadow: "0 0 6px rgba(0,0,0,0.2)",
        }}
      >
        <span>{status}</span>
        {permissionDenied && (
          <button
            className="btn btn-sm"
            style={{ background: "#8d4a4a", color: "white" }}
            onClick={retryPermission}
          >
            Grant Screenshot Permission
          </button>
        )}
      </div>

      {/* Warning Modal */}
      {showWarning && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "8px",
              padding: "20px",
              maxWidth: "400px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            }}
          >
            <h4 style={{ marginBottom: "10px" }}>⚠️ Share Entire Screen</h4>
            <p style={{ fontSize: "14px", color: "#444" }}>
              You’ve selected a window or browser tab instead of your entire screen.  
              To capture screenshots correctly, please stop sharing and reselect  
              <strong> “Entire Screen” </strong> when prompted.
            </p>
            <button
              onClick={retryPermission}
              style={{
                marginTop: "10px",
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Re-select Entire Screen
            </button>
          </div>
        </div>
      )}
    </>
  );
}
