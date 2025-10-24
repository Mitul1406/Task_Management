import { useEffect, useRef, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { toast } from "react-toastify";

const SCREENSHOT_INTERVAL = 10 * 1000;
const PERMISSION_ALERT_INTERVAL = 60 * 1000;

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
  const [showWarning, setShowWarning] = useState(true); // show modal on load
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isFirefox = typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);

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

  // --- Start periodic screenshots ---
  useEffect(() => {
    if (!stream || !userId) return;

    const captureInterval = setInterval(() => captureAndUpload(), SCREENSHOT_INTERVAL);
    intervalRef.current = captureInterval;

    return () => {
      clearInterval(captureInterval);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream, userId]);

  // --- Permission denied toast alerts ---
  useEffect(() => {
    let toastInterval: NodeJS.Timeout;

    if (permissionDenied) {
      toast.error("⚠️ Screenshot permission denied. Please grant permission!");
      toastInterval = setInterval(() => {
        toast.error("⚠️ Screenshot permission denied. Please grant permission!");
      }, PERMISSION_ALERT_INTERVAL);
    }

    return () => {
      if (toastInterval) clearInterval(toastInterval);
    };
  }, [permissionDenied]);

  // --- Request screen share ---
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

      let isFullScreen = false;
      if (settings.displaySurface) {
        isFullScreen = settings.displaySurface === "monitor";
      } else if (isFirefox) {
        const label = track.label?.toLowerCase() || "";
        isFullScreen = label.includes("screen") || label.includes("entire") || label.includes("monitor");
      } else {
        const label = track.label?.toLowerCase() || "";
        isFullScreen = label.includes("screen") || label.includes("entire");
      }

      if (!isFullScreen) {
        setShowWarning(true); // show modal if not full screen
        mediaStream.getTracks().forEach((t) => t.stop());
        return;
      }

      setStream(mediaStream);
      setStatus("Sharing...");
      setPermissionDenied(false);
      setShowWarning(false); // hide modal once full-screen granted

      track.onended = () => {
        setStatus("Stopped");
        setPermissionDenied(true);
        setStream(null);
        clearInterval(intervalRef.current!);
      };
    } catch (err) {
      console.error("Permission denied", err);
      setStatus("Permission denied");
      setPermissionDenied(true);
      onPermissionDenied?.();
    }
  };

  // --- Retry button handler ---
  const retryPermission = async () => {
    setPermissionDenied(false);
    setShowWarning(false);
    setStatus("Requesting permission...");
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
        try { await video.play(); } catch {}
        resolve();
      };
    });

    const drawFrame = async () => {
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
          const token = localStorage.getItem("token");
          const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/upload-screenshot`, {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok) throw new Error("Upload failed");
          setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
        } catch (err) {
          console.error("Upload failed", err);
          setStatus("Upload failed");
        }
      }, "image/webp", 0.9);
    };

    if ((video as any).requestVideoFrameCallback) {
      (video as any).requestVideoFrameCallback(() => drawFrame());
    } else {
      setTimeout(() => drawFrame(), 200);
    }
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
      {(showWarning || permissionDenied) && (
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
      maxWidth: "450px",
      textAlign: "left",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      lineHeight: "1.5",
    }}
  >
    <h4 style={{ marginBottom: "12px", textAlign: "center" }}>⚠️ Share Your Entire Screen</h4>
    
    <p style={{ fontSize: "14px", color: "#444" }}>
      To allow Task Tracker to capture accurate screenshots of your work:
    </p>
    
    <ul style={{ fontSize: "14px", color: "#444", paddingLeft: "20px" }}>
      <li>When prompted by your browser, select <strong>“Entire Screen”</strong>.</li>
      <li>Do <strong>not</strong> select a specific window or browser tab, otherwise screenshots will be incomplete.</li>
      <li>Task Tracker only captures screenshots for monitoring work activity—it does <strong>not</strong> record personal data outside the selected screen.</li>
      <li>If you accidentally select the wrong option, stop sharing and click the button below to try again.</li>
    </ul>

    <p style={{ fontSize: "14px", color: "#444", marginTop: "10px" }}>
      After granting permission, screenshots will be taken automatically at regular intervals.
    </p>

    <div style={{ textAlign: "center", marginTop: "15px" }}>
      <button
        onClick={retryPermission}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          padding: "10px 16px",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Select Entire Screen
      </button>
    </div>
  </div>
</div>

      )}
    </>
  );
}

// import { useEffect, useRef, useState } from "react";
// import { jwtDecode } from "jwt-decode";
// import { toast } from "react-toastify";

// const SCREENSHOT_INTERVAL = 10 * 1000; 
// const PERMISSION_ALERT_INTERVAL = 60 * 1000;

// interface TokenPayload {
//   id?: string;
//   userId?: string;
// }

// interface AutoScreenshotProps {
//   onPermissionDenied?: () => void;
// }

// export default function AutoScreenshot({ onPermissionDenied }: AutoScreenshotProps) {
//   const [userId, setUserId] = useState<string | null>(null);
//   const [status, setStatus] = useState("Idle");
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   const [permissionDenied, setPermissionDenied] = useState(false);
//   const [showWarning, setShowWarning] = useState(false);
//   const intervalRef = useRef<NodeJS.Timeout | null>(null);
//   const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   // --- Decode user ID from token ---
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     try {
//       const decoded = jwtDecode<TokenPayload>(token);
//       setUserId(decoded.id || decoded.userId || null);
//     } catch (err) {
//       console.error("Invalid token", err);
//     }
//   }, []);

//   // --- Start screen capture ---
//   useEffect(() => {
//     if (!userId) return;
//     requestScreenShare();
//   }, [userId]);

//   // --- Periodic screenshot capture ---
//   useEffect(() => {
//     if (!stream || !userId) return;

//     const captureInterval = setInterval(() => captureAndUpload(), SCREENSHOT_INTERVAL);
//     intervalRef.current = captureInterval;

//     return () => {
//       clearInterval(captureInterval);
//       stream?.getTracks().forEach((t) => t.stop());
//     };
//   }, [stream, userId]);

// useEffect(() => {
//   let toastInterval: NodeJS.Timeout;

//   if (permissionDenied) {
//     toast.error("⚠️ Screenshot permission denied. Please grant permission!");

//     toastInterval = setInterval(() => {
//       toast.error("⚠️ Screenshot permission denied. Please grant permission!");
//     }, PERMISSION_ALERT_INTERVAL);
//   }

//   return () => {
//     if (toastInterval) clearInterval(toastInterval);
//   };
// }, [permissionDenied]);



//   // --- Ask for screen share ---
//   const requestScreenShare = async () => {
//     try {
//       setStatus("Requesting permission...");

//       const mediaStream = await navigator.mediaDevices.getDisplayMedia({
//         video: { displaySurface: "monitor" } as any,
//       });

//       const track = mediaStream.getVideoTracks()[0];
//       const settings = track.getSettings() as Partial<MediaTrackSettings> & {
//         displaySurface?: "monitor" | "window" | "browser" | "application";
//       };

//       let isFullScreen = false;
//       if (settings.displaySurface) {
//         isFullScreen = settings.displaySurface === "monitor";
//       } else {
//         const label = track.label?.toLowerCase() || "";
//         isFullScreen = label.includes("screen") || label.includes("entire");
//       }

//       if (!isFullScreen) {
//         setShowWarning(true);
//         setStatus("Please share entire screen");
//         mediaStream.getTracks().forEach((t) => t.stop());
//         setPermissionDenied(true);
//         return;
//       }

//       setStream(mediaStream);
//       setStatus("Sharing...");
//       setPermissionDenied(false);

//       track.onended = () => {
//         setStatus("Stopped");
//         setPermissionDenied(true);
//         clearInterval(intervalRef.current!);
//         setStream(null);
//       };
//     } catch (err) {
//       console.error("Permission denied", err);
//       setStatus("Permission denied");
//       setPermissionDenied(true);
//       onPermissionDenied?.();
//     }
//   };

//   // --- Retry permission ---
//   const retryPermission = async () => {
//     setPermissionDenied(false);
//     setShowWarning(false);
//     setStatus("Retrying...");
//     await requestScreenShare();
//   };

//   // --- Capture and upload ---
//   const captureAndUpload = async () => {
//     if (!stream || !userId) return;

//     const video = document.createElement("video");
//     video.srcObject = stream;
//     video.muted = true;
//     video.playsInline = true;
//     video.autoplay = true;

//     await new Promise<void>((resolve) => {
//       video.onloadedmetadata = async () => {
//         try { await video.play(); } catch {}
//         resolve();
//       };
//     });

//     const canvas = document.createElement("canvas");
//     canvas.width = video.videoWidth || 1920;
//     canvas.height = video.videoHeight || 1080;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

//     canvas.toBlob(async (blob) => {
//       if (!blob) return;
//       const formData = new FormData();
//       formData.append("screenshot", blob, "screenshot.webp");
//       formData.append("userId", userId);

//       try {
//         const res = await fetch("http://localhost:4040/upload-screenshot", {
//           method: "POST",
//           body: formData,
//         });
//         if (!res.ok) throw new Error("Upload failed");
//         setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
//       } catch (err) {
//         console.error("Upload failed", err);
//         setStatus("Upload failed");
//       }
//     }, "image/webp", 0.9);
//   };

//   return (
//     <>
//       {/* Status Bar */}
//       <div
//         style={{
//           position: "fixed",
//           bottom: "10px",
//           right: "10px",
//           fontSize: "12px",
//           zIndex: 1050,
//           display: "flex",
//           alignItems: "center",
//           gap: "6px",
//           backgroundColor: "rgba(255,255,255,0.9)",
//           padding: "6px 8px",
//           borderRadius: "4px",
//           boxShadow: "0 0 6px rgba(0,0,0,0.2)",
//         }}
//       >
//         <span>{status}</span>
//         {permissionDenied && (
//           <button
//             className="btn btn-sm"
//             style={{ background: "#8d4a4a", color: "white" }}
//             onClick={retryPermission}
//           >
//             Grant Screenshot Permission
//           </button>
//         )}
//       </div>

//       {/* Warning Modal */}
//       {showWarning && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             width: "100vw",
//             height: "100vh",
//             background: "rgba(0,0,0,0.6)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             zIndex: 2000,
//           }}
//         >
//           <div
//             style={{
//               background: "white",
//               borderRadius: "8px",
//               padding: "20px",
//               maxWidth: "400px",
//               textAlign: "center",
//               boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
//             }}
//           >
//             <h4 style={{ marginBottom: "10px" }}>⚠️ Share Entire Screen</h4>
//             <p style={{ fontSize: "14px", color: "#444" }}>
//               You’ve selected a window or browser tab instead of your entire screen.  
//               To capture screenshots correctly, please stop sharing and reselect  
//               <strong> “Entire Screen” </strong> when prompted.
//             </p>
//             <button
//               onClick={retryPermission}
//               style={{
//                 marginTop: "10px",
//                 background: "#007bff",
//                 color: "white",
//                 border: "none",
//                 padding: "8px 12px",
//                 borderRadius: "4px",
//                 cursor: "pointer",
//               }}
//             >
//               Re-select Entire Screen
//             </button>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
