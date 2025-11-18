import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { jwtDecode } from "jwt-decode";
import { notifyUser } from "../components/notifyUser";

interface TokenPayload {
  id?: string;
  userId?: string;
}

interface AutoScreenshotProps {
  onPermissionDenied?: () => void;
}

export interface AutoScreenshotRef {
  requestScreenShare: () => Promise<boolean>;
  hasPermission: boolean;
  stopScreenShare: () => void;
}

const AutoScreenshot = forwardRef<AutoScreenshotRef, AutoScreenshotProps>(
  ({ onPermissionDenied }, ref) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [status, setStatus] = useState("Idle");
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const [internalResolve, setInternalResolve] =
      useState<((granted: boolean) => void) | null>(null);

    // --- Decode Token ---
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

    // --- Periodic Screenshot Capture ---
    useEffect(() => {
      if (!stream || !userId) return;

      const MIN_INTERVAL = 1000;
      const MAX_INTERVAL = 15000;

      function randomInterval() {
        return (
          Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) +
          MIN_INTERVAL
        );
      }

      let timeoutId: NodeJS.Timeout;

      const schedule = async () => {
        await captureAndUpload();
        timeoutId = setTimeout(schedule, randomInterval());
      };

      timeoutId = setTimeout(schedule, randomInterval());

      return () => clearTimeout(timeoutId);
    }, [stream, userId]);

    // --- Request Screen Share from Parent ---
    const requestScreenShare = (): Promise<boolean> => {
      return new Promise((resolve) => {
        // ✅ If already sharing, skip modal
        if (stream) {
          resolve(true);
          return;
        }
        setInternalResolve(() => resolve);
        setShowInstructionModal(true);
      });
    };

    // --- Handle Confirm Permission ---
    const handleConfirmPermission = async () => {
      setShowInstructionModal(false);
      try {
        setStatus("Requesting permission...");

        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "monitor" } as any,
        });

        const track = mediaStream.getVideoTracks()[0];
        const settings = track.getSettings() as Partial<MediaTrackSettings> & {
          displaySurface?: "monitor" | "window" | "browser" | "application";
        };

        const label = track.label?.toLowerCase() || "";
        const isFullScreen =
          settings.displaySurface === "monitor" ||
          label.includes("screen") ||
          label.includes("entire") ||
          label.includes("monitor");

        if (!isFullScreen) {
          mediaStream.getTracks().forEach((t) => t.stop());
          setStatus("Permission denied (not entire screen)");
          notifyUser("Please Provide Entire Screen Permission","Need to select the entire screen permission to proceed furthur.")
          onPermissionDenied?.();
          internalResolve?.(false);
          setShowInstructionModal(true); // 🔁 Show modal again
          return;
        }

        setStream(mediaStream);
        setStatus("Sharing...");
        internalResolve?.(true);

        track.onended = async() => {
          try {
      await fetch("http://localhost:4040/broadcast-stop-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      console.error("Failed to broadcast stop confirmation", err);
    }
          setStatus("Stopped");
          setStream(null);
          onPermissionDenied?.();
          // setShowInstructionModal(true); // 🔁 Show modal again
        };
      } catch (err) {
        console.error("Permission denied", err);
        setStatus("Permission denied");
        onPermissionDenied?.();
        internalResolve?.(false);
        setShowInstructionModal(true); // 🔁 Show modal again
      }
    };

    // --- Capture & Upload Screenshot ---
    const captureAndUpload = async () => {
      if (!stream || !userId) return;

      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const formData = new FormData();
        formData.append("screenshot", blob);
        formData.append("userId", userId);

        try {
          const token = localStorage.getItem("token");
          await fetch(`${process.env.REACT_APP_BACKEND_URL}/upload-screenshot`, {
            method: "POST",
            body: formData,
            headers: { Authorization: `Bearer ${token}` },
          });
          setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
        } catch {
          setStatus("Upload failed");
        }
      }, "image/webp", 0.9);
    };

    // --- Expose functions to parent ---
    useImperativeHandle(ref, () => ({
      requestScreenShare,
      hasPermission: !!stream,
      stopScreenShare: () => {
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          setStream(null);
          setStatus("Stopped");
          // setShowInstructionModal(true);
        }
      },
    }));

    return (
      <>
        {showInstructionModal && (
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
      overflow:"auto"
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        padding: "24px 28px",
        maxWidth: "480px",
        width: "90%",
        textAlign: "left",
        boxShadow: "0 4px 16px rgba(131, 19, 107, 0.5)",
        lineHeight: "1.6",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative", // 🔹 Needed for absolute X positioning
      }}
    >
      <h3 style={{ marginBottom: "14px", textAlign: "center", color: "#222" }}>
        ⚠️ Screen Sharing Required
      </h3>
      <p style={{ fontSize: "15px", color: "#444", marginBottom: "10px" }}>
        To help Task Tracker capture your work screenshots correctly, please follow these steps:
      </p>
      <ul
        style={{
          fontSize: "14px",
          color: "#333",
          paddingLeft: "20px",
          marginBottom: "12px",
        }}
      >
        <li>
          When prompted by your browser, <strong>you must select “Entire Screen”</strong>.
        </li>
        <li>
          <strong>Do not</strong> select a specific window or browser tab — this will prevent proper screenshot capture, and you{" "}
          <strong>won’t be able to use our services</strong> until “Entire Screen” is selected.
        </li>
        <li>
          Task Tracker only captures your shared screen during <strong>active work sessions</strong>.
        </li>
        <li>
          If you <strong>stop screen sharing</strong>, your running task timer will be{" "}
          <strong>automatically stopped</strong> for tracking accuracy.
        </li>
        <li>
         Please <strong>allow browser notifications</strong> for this website so you can
         receive <strong>system-level alerts</strong> — for example, when your task starts
         or stops automatically.{" "}
         </li>
      </ul>
      <p style={{ fontSize: "14px", color: "#555", marginTop: "8px" }}>
        Once permission is granted, screenshots will be taken automatically at safe, regular intervals.
      </p>
      <div className="d-flex justify-content-between" style={{marginTop: "20px" }}>
        <button
        onClick={() => setShowInstructionModal(false)}
        style={{
            background: "#64686bff",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "15px",
            transition: "background 0.2s ease",
          }}
        onMouseOver={(e) => (e.currentTarget.style.color = "#FFF")}
        onMouseOut={(e) => (e.currentTarget.style.color = "#FFF")}
        aria-label="Close"
        className="ms-2"
      >
        Close
      </button>
        <button
          onClick={handleConfirmPermission}
          style={{
            background: "#007bff",
            color: "#fff",
            border: "none",
            padding: "10px 18px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "15px",
            transition: "background 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#0069d9")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#007bff")}
        >
          Select Entire Screen
        </button>
      </div>
    </div>
  </div>
)}

        <div
          style={{
            position: "fixed",
            bottom: "10px",
            right: "10px",
            background: "#fff",
            padding: "6px 8px",
            borderRadius: "6px",
            fontSize: "12px",
            boxShadow: "0 0 5px rgba(0,0,0,0.2)",
            zIndex: 1050,
          }}
        >
          {status}
        </div>
      </>
    );
  }
);

export default AutoScreenshot;


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
