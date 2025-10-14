import { useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";

const SCREENSHOT_INTERVAL = 10 * 1000; // 10 seconds

interface TokenPayload {
  id?: string;
  userId?: string;
}

export default function AutoScreenshot() {
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState("Idle");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Get token from localStorage and decode userId
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const id = decoded.id || decoded.userId || null;
      setUserId(id);
    } catch (err) {
      console.error("Invalid token", err);
    }
  }, []);

  // Ask for screen permission once userId is available
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        console.log("🟢 Asking for screen permission...");
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setStream(mediaStream);
        setStatus("Sharing...");

        // Listen for when user stops sharing
        mediaStream.getTracks().forEach(track => {
          track.onended = () => {
            console.log("🛑 Screen sharing stopped by user");
            setStatus("Stopped");
            clearInterval(intervalRef.current!);
            setStream(null);
          };
        });

      } catch (err) {
        console.error("❌ Screen capture permission denied", err);
        setStatus("Permission denied");
      }
    };

    init();
  }, [userId]);

  // Start screenshot interval
  useEffect(() => {
    if (!stream || !userId) return;

    const captureInterval = setInterval(() => captureAndUpload(), SCREENSHOT_INTERVAL);
    intervalRef.current = captureInterval;

    return () => {
      clearInterval(captureInterval);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream, userId]);

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
          resolve();
        } catch {
          resolve();
        }
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

        const time = new Date().toLocaleTimeString();
        console.log(`📸 Screenshot uploaded at ${time}`);
        setStatus(`Uploaded at ${time}`);
      } catch (err) {
        console.error("❌ Screenshot upload failed", err);
        setStatus("Upload failed");
      }
    }, "image/webp", 0.9);
  };

  return (
    <div style={{ position: "fixed", bottom: 10, right: 10, fontSize: 12 }}>
      {status}
    </div>
  );
}
