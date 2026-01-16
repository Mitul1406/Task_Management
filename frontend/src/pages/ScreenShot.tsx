import {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { jwtDecode } from "jwt-decode";
import { notifyUser } from "../components/notifyUser";
import { useScreenShare } from "../context/ScreenRecordContext";

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
    const { globalStream, setGlobalStream } = useScreenShare();

    const [userId, setUserId] = useState<string | null>(null);
    const [status, setStatus] = useState("Idle");
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [showInstructionModal, setShowInstructionModal] = useState(false);
    const resolveRef = useRef<((val: boolean) => void) | null>(null);

    const screenshotTimerRef = useRef<NodeJS.Timeout | null>(null);
    const firstRender = useRef(true);

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const decoded = jwtDecode<TokenPayload>(token);
        setUserId(decoded.id || decoded.userId || null);
      } catch (err) {
        console.error("Invalid token");
      }
    }, []);

    useEffect(() => {
      if (globalStream && !localStream) {
        setLocalStream(globalStream);
        setStatus("Sharing...");
      }

      if (!globalStream && localStream) {
        setLocalStream(null);
        setStatus("Stopped");
      }
    }, [globalStream]);

    useEffect(() => {
      if (firstRender.current) {
        firstRender.current = false;
        return;
      }

      if (!globalStream || !userId) return;

      const MIN = (Number(process.env.SCREENSHOT_INTERVAL_MIN) || 8) * 60 * 1000; 
      const MAX = (Number(process.env.SCREENSHOT_INTERVAL_MAX) || 12) * 60 * 1000; 

      const schedule = async () => {
        await captureAndUpload();
        screenshotTimerRef.current = setTimeout(
          schedule,
          Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
        );
      };

      screenshotTimerRef.current = setTimeout(
        schedule,
        Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
      );

      return () => {
        if (screenshotTimerRef.current)
          clearTimeout(screenshotTimerRef.current);
      };
    }, [globalStream, userId]);

    const requestScreenShare = (): Promise<boolean> => {
      return new Promise((resolve) => {
        if (localStream) {
          resolve(true);
          return;
        }
        resolveRef.current = resolve;
        setShowInstructionModal(true);
      });
    };

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
          notifyUser(
            "Please Provide Entire Screen Permission",
            "Need to select the entire screen permission to proceed further."
          );
          resolveRef.current?.(false);
          setShowInstructionModal(true);
          return;
        }

        setGlobalStream(mediaStream);
        setLocalStream(mediaStream);
        setStatus("Sharing...");
        resolveRef.current?.(true);

        track.onended = async () => {
          try {
            await fetch(
              `${process.env.REACT_APP_BACKEND_URL}/broadcast-stop-confirm`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
              }
            );
          } catch {}

          setGlobalStream(null);
          setLocalStream(null);
          setStatus("Stopped");
          onPermissionDenied?.();
        };
      } catch (err) {
        resolveRef.current?.(false);
        setShowInstructionModal(true);
      }
    };

    const captureAndUpload = async () => {
      if (!globalStream || !userId) return;

      const video = document.createElement("video");
      video.srcObject = globalStream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;

          const formData = new FormData();
          formData.append("screenshot", blob, `screenshot_${Date.now()}.webp`);
          formData.append("userId", userId);

          try {
            const token = localStorage.getItem("token");
            await fetch(
              `${process.env.REACT_APP_BACKEND_URL}/upload-screenshot`,
              {
                method: "POST",
                body: formData,
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
          } catch {
            setStatus("Upload failed");
          }
        },
        "image/webp",
        0.9
      );
    };

    const stopScreenShare = () => {
      if (globalStream) {
        globalStream.getTracks().forEach((t) => t.stop());
      }
      setGlobalStream(null);
      setLocalStream(null);
      setStatus("Stopped");
    };

    useImperativeHandle(ref, () => ({
      requestScreenShare,
      hasPermission: !!globalStream,
      stopScreenShare,
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
      className="main-color"
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
        aria-label="Close"
        className="btn cancel-btn"
      >
        Close
      </button>
        <button
          onClick={handleConfirmPermission}
          className="btn common-btn-in"
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

// import React, {
//   useEffect,
//   useState,
//   useImperativeHandle,
//   forwardRef,
// } from "react";
// import { jwtDecode } from "jwt-decode";
// import { notifyUser } from "../components/notifyUser";
// import { useScreenShare } from "../context/ScreenRecordContext";

// interface TokenPayload {
//   id?: string;
//   userId?: string;
// }

// interface AutoScreenshotProps {
//   onPermissionDenied?: () => void;
// }

// export interface AutoScreenshotRef {
//   requestScreenShare: () => Promise<boolean>;
//   hasPermission: boolean;
//   stopScreenShare: () => void;
// }


// const AutoScreenshot = forwardRef<AutoScreenshotRef, AutoScreenshotProps>(
//   ({ onPermissionDenied }, ref) => {
// const { globalStream, setGlobalStream } = useScreenShare();

//     const [userId, setUserId] = useState<string | null>(null);
//     const [status, setStatus] = useState("Idle");
//     const [stream, setStream] = useState<MediaStream | null>(null);
//     const [showInstructionModal, setShowInstructionModal] = useState(false);
//     const [internalResolve, setInternalResolve] =
//       useState<((granted: boolean) => void) | null>(null);

//     // --- Decode Token ---
//     useEffect(() => {
      
//       const token = localStorage.getItem("token");
//       if (!token) return;
//       try {
//         const decoded = jwtDecode<TokenPayload>(token);
//         setUserId(decoded.id || decoded.userId || null);
//       } catch (err) {
//         console.error("Invalid token", err);
//       }
//     }, []);

//     useEffect(() => {
//       if (!globalStream || !userId) return;

//       const MIN_INTERVAL = 100;
//       const MAX_INTERVAL = 1500;

//       function randomInterval() {
//         return (
//           Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) +
//           MIN_INTERVAL
//         );
//       }

//       let timeoutId: NodeJS.Timeout;

//       const schedule = async () => {
//         await captureAndUpload();
//         timeoutId = setTimeout(schedule, randomInterval());
//       };

//       timeoutId = setTimeout(schedule, randomInterval());

//       return () => clearTimeout(timeoutId);
//     }, [globalStream, userId]);
//     // stream

//     const requestScreenShare = (): Promise<boolean> => {
//       return new Promise((resolve) => {
//         if (stream) {
//           resolve(true);
//           return;
//         }
//         setInternalResolve(() => resolve);
//         setShowInstructionModal(true);
//       });
//     };

//     // --- Handle Confirm Permission ---
//     const handleConfirmPermission = async () => {
//       setShowInstructionModal(false);
//       try {
//         setStatus("Requesting permission...");

//         const mediaStream = await navigator.mediaDevices.getDisplayMedia({
//           video: { displaySurface: "monitor" } as any,
//         });

//         const track = mediaStream.getVideoTracks()[0];
//         const settings = track.getSettings() as Partial<MediaTrackSettings> & {
//           displaySurface?: "monitor" | "window" | "browser" | "application";
//         };

//         const label = track.label?.toLowerCase() || "";
//         const isFullScreen =
//           settings.displaySurface === "monitor" ||
//           label.includes("screen") ||
//           label.includes("entire") ||
//           label.includes("monitor");

//         if (!isFullScreen) {
//           mediaStream.getTracks().forEach((t) => t.stop());
//           setStatus("Permission denied (not entire screen)");
//           notifyUser("Please Provide Entire Screen Permission","Need to select the entire screen permission to proceed furthur.")
//           onPermissionDenied?.();
//           internalResolve?.(false);
//           setShowInstructionModal(true); // 🔁 Show modal again
//           return;
//         }
//         setGlobalStream(mediaStream);
//         setStream(mediaStream);
//         setStatus("Sharing...");
//         internalResolve?.(true);

//         track.onended = async() => {
//           try {
//       await fetch(`${process.env.REACT_APP_BACKEND_URL}/broadcast-stop-confirm`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId }),
//       });
//     } catch (err) {
//       console.error("Failed to broadcast stop confirmation", err);
//     }
//           setStatus("Stopped");
//           setGlobalStream(null);
//           setStream(null);
//           onPermissionDenied?.();
//           // setShowInstructionModal(true); // 🔁 Show modal again
//         };
//       } catch (err) {
//         console.error("Permission denied", err);
//         setStatus("Permission denied");
//         onPermissionDenied?.();
//         internalResolve?.(false);
//         setShowInstructionModal(true); // 🔁 Show modal again
//       }
//     };

//     // --- Capture & Upload Screenshot ---
//     const captureAndUpload = async () => {
//       if (!globalStream || !userId) return;

//       const video = document.createElement("video");
//       video.srcObject = globalStream;
//       await video.play();

//       const canvas = document.createElement("canvas");
//       canvas.width = video.videoWidth;
//       canvas.height = video.videoHeight;
//       const ctx = canvas.getContext("2d");
//       if (!ctx) return;

//       ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//       canvas.toBlob(async (blob) => {
//         if (!blob) return;
//         const formData = new FormData();
//         // formData.append("screenshot", blob);
//         formData.append("screenshot", blob, `screenshot_${Date.now()}.webp`);
//         formData.append("userId", userId);

//         try {
//           const token = localStorage.getItem("token");
//           await fetch(`${process.env.REACT_APP_BACKEND_URL}/upload-screenshot`, {
//             method: "POST",
//             body: formData,
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           setStatus(`Uploaded at ${new Date().toLocaleTimeString()}`);
//         } catch {
//           setStatus("Upload failed");
//         }
//       }, "image/webp", 0.2);
//     };

//     // --- Expose functions to parent ---
//     useImperativeHandle(ref, () => ({
//       requestScreenShare,
//       // hasPermission: !!stream,
//       hasPermission: !!globalStream,
//       // stopScreenShare: () => {
//       //   if (stream) {
//       //     stream.getTracks().forEach((t) => t.stop());
//       //     setStream(null);
//       //     setStatus("Stopped");
//       //     // setShowInstructionModal(true);
//       //   }
//       // },
//       stopScreenShare: () => {
//   if (globalStream) {
//     globalStream.getTracks().forEach(t => t.stop());
//     setGlobalStream(null);
//   }
//   setStream(null);
// }

//     }));

//     return (
//       <>
//         {showInstructionModal && (
//   <div
//     style={{
//       position: "fixed",
//       top: 0,
//       left: 0,
//       width: "100vw",
//       height: "100vh",
//       background: "rgba(0,0,0,0.6)",
//       display: "flex",
//       justifyContent: "center",
//       alignItems: "center",
//       zIndex: 2000,
//       overflow:"auto"
//     }}
//   >
//     <div
//       style={{
//         background: "#fff",
//         borderRadius: "10px",
//         padding: "24px 28px",
//         maxWidth: "480px",
//         width: "90%",
//         textAlign: "left",
//         boxShadow: "0 4px 16px rgba(131, 19, 107, 0.5)",
//         lineHeight: "1.6",
//         fontFamily: "Inter, system-ui, sans-serif",
//         position: "relative", // 🔹 Needed for absolute X positioning
//       }}
//     >
//       <h3 style={{ marginBottom: "14px", textAlign: "center", color: "#222" }}>
//         ⚠️ Screen Sharing Required
//       </h3>
//       <p style={{ fontSize: "15px", color: "#444", marginBottom: "10px" }}>
//         To help Task Tracker capture your work screenshots correctly, please follow these steps:
//       </p>
//       <ul
//         style={{
//           fontSize: "14px",
//           color: "#333",
//           paddingLeft: "20px",
//           marginBottom: "12px",
//         }}
//       >
//         <li>
//           When prompted by your browser, <strong>you must select “Entire Screen”</strong>.
//         </li>
//         <li>
//           <strong>Do not</strong> select a specific window or browser tab — this will prevent proper screenshot capture, and you{" "}
//           <strong>won’t be able to use our services</strong> until “Entire Screen” is selected.
//         </li>
//         <li>
//           Task Tracker only captures your shared screen during <strong>active work sessions</strong>.
//         </li>
//         <li>
//           If you <strong>stop screen sharing</strong>, your running task timer will be{" "}
//           <strong>automatically stopped</strong> for tracking accuracy.
//         </li>
//         <li>
//          Please <strong>allow browser notifications</strong> for this website so you can
//          receive <strong>system-level alerts</strong> — for example, when your task starts
//          or stops automatically.{" "}
//          </li>
//       </ul>
//       <p style={{ fontSize: "14px", color: "#555", marginTop: "8px" }}>
//         Once permission is granted, screenshots will be taken automatically at safe, regular intervals.
//       </p>
//       <div className="d-flex justify-content-between" style={{marginTop: "20px" }}>
//         <button
//         onClick={() => setShowInstructionModal(false)}
//         style={{
//             background: "#64686bff",
//             color: "#fff",
//             border: "none",
//             padding: "10px 18px",
//             borderRadius: "6px",
//             cursor: "pointer",
//             fontWeight: 600,
//             fontSize: "15px",
//             transition: "background 0.2s ease",
//           }}
//         onMouseOver={(e) => (e.currentTarget.style.color = "#FFF")}
//         onMouseOut={(e) => (e.currentTarget.style.color = "#FFF")}
//         aria-label="Close"
//         className="ms-2"
//       >
//         Close
//       </button>
//         <button
//           onClick={handleConfirmPermission}
//           style={{
//             background: "#007bff",
//             color: "#fff",
//             border: "none",
//             padding: "10px 18px",
//             borderRadius: "6px",
//             cursor: "pointer",
//             fontWeight: 600,
//             fontSize: "15px",
//             transition: "background 0.2s ease",
//           }}
//           onMouseOver={(e) => (e.currentTarget.style.background = "#0069d9")}
//           onMouseOut={(e) => (e.currentTarget.style.background = "#007bff")}
//         >
//           Select Entire Screen
//         </button>
//       </div>
//     </div>
//   </div>
// )}

//         <div
//           style={{
//             position: "fixed",
//             bottom: "10px",
//             right: "10px",
//             background: "#fff",
//             padding: "6px 8px",
//             borderRadius: "6px",
//             fontSize: "12px",
//             boxShadow: "0 0 5px rgba(0,0,0,0.2)",
//             zIndex: 1050,
//           }}
//         >
//           {status}
//         </div>
//       </>
//     );
//   }
// );

// export default AutoScreenshot;

