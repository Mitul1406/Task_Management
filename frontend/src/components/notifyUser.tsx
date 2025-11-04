import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const NotificationPermissionBanner: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const flag=useRef(true);
  
  useEffect(() => {
    if (!("Notification" in window)) {
      setSupported(false);
      return;
    }

    const current = Notification.permission;
    if(current === "granted" && flag)
    {
      toast.success("Notifications already enabled")
      notifyUser("Notifications Enabled!", "You’ll now receive alerts when timers or tasks change.");
      flag.current=false;
    }
    setPermission(current);

    // show modal only if permission not granted
    if (current !== "granted") {
      setShowModal(true);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser doesn't support notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      // toast.success("✅ Notifications already enabled");
      setShowModal(false);
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        notifyUser("Notifications Enabled!","You’ll now receive alerts when timers or tasks change.");
        toast.success("Notifications enabled successfully!");
        setShowModal(false);
      } else if (result === "denied") {
        toast.warn("Notifications are blocked. Please enable them manually below 👇");
      }
    } catch (err) {
      console.error("Notification permission error:", err);
      toast.error("Could not request notification permission.");
    }
  };

  const renderInstructions = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("chrome")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Chrome:</b> Click the <b>🔒</b> icon → <b>Site settings</b> → <b>Notifications → Allow , Please reload the page after doing this.</b>.
        </p>
      );
    } else if (ua.includes("edge")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Edge:</b> Click the <b>🔒</b> icon → <b>Permissions for this site</b> → <b>Notifications → Allow, Please reload the page after doing this.</b>.
        </p>
      );
    } else if (ua.includes("firefox")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Firefox:</b> Go to <b>Settings → Privacy & Security → Permissions → Notifications → Settings , Please reload the page after doing this.</b>.
        </p>
      );
    } else if (ua.includes("safari")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Safari:</b> Go to <b>Preferences → Websites → Notifications → Allow this site , Please reload the page after doing this.</b>.
        </p>
      );
    } else {
      return <p style={{ margin: 0 }}>Open your browser settings and allow notifications for this site , Please reload the page after doing this.</p>;
    }
  };

  if (!supported || permission === "granted" || !showModal) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          padding: "24px",
          width: "90%",
          maxWidth: "420px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <h5 style={{ marginBottom: 12 }}>🔔 Enable Notifications</h5>
        <p style={{ fontSize: 15, color: "#333" }}>
          Allow browser notifications to receive instant alerts when tasks or timers update.
        </p>

        <button
          onClick={requestPermission}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: 500,
            marginTop: 10,
          }}
        >
          Enable Notifications
        </button>

        {permission === "denied" && (
          <div
            style={{
              marginTop: 15,
              fontSize: 13,
              color: "#555",
              textAlign: "center",
              background: "#fff8d6",
              padding: "10px",
              borderRadius: "6px",
            }}
          >
            <div style={{ marginBottom: 6 }}>
              🔒 Notifications are blocked. Please enable them manually:
            </div>
            {renderInstructions()}
          </div>
        )}

        <button
          onClick={() => setShowModal(false)}
          className="ms-2"
          style={{
            background: "#666",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "8px 14px",
            cursor: "pointer",
            fontWeight: 500,
            marginTop: 10,
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;

export const notifyUser = (title: string, body?: string, url?: string) => {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body: body || "",
        icon: "/favicon.png",
      });

      notification.onclick = (event) => {
        event.preventDefault(); 

        if (url) {
          window.focus();
          window.open(url, "_self");
        }
      };
    } else {
      console.warn("Notification not permitted:", Notification.permission);
    }
  }
};


