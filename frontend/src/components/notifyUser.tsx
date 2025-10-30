import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const NotificationPermissionBanner: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("Notification" in window)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser doesn't support notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      toast.success("✅ Notifications already enabled");
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        new Notification("✅ Notifications Enabled!", {
          body: "You’ll now receive alerts when timers or tasks change.",
        });
        toast.success("Notifications enabled successfully!");
      } else if (result === "denied") {
        toast.warn("Notifications are blocked. Please enable them manually below 👇");
      }
    } catch (err) {
      console.error("Notification permission error:", err);
      toast.error("Could not request notification permission.");
    }
  };

  /** 🔍 Browser-specific instructions */
  const renderInstructions = () => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("chrome")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Chrome:</b> Click the <b>🔒</b> icon → <b>Site settings</b> → <b>Notifications → Allow</b>.
        </p>
      );
    } else if (ua.includes("edge")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Edge:</b> Click the <b>🔒</b> icon → <b>Permissions for this site</b> → <b>Notifications → Allow</b>.
        </p>
      );
    } else if (ua.includes("firefox")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Firefox:</b> Go to <b>Settings → Privacy & Security → Permissions → Notifications → Settings</b>.
        </p>
      );
    } else if (ua.includes("safari")) {
      return (
        <p style={{ margin: 0 }}>
          <b>Safari:</b> Go to <b>Preferences → Websites → Notifications → Allow this site</b>.
        </p>
      );
    } else {
      return <p style={{ margin: 0 }}>Open your browser settings and allow notifications for this site.</p>;
    }
  };

  if (!supported) {
    return (
      <div
        style={{
          background: "#ffeaea",
          padding: "12px 16px",
          textAlign: "center",
          borderBottom: "1px solid #ffcccc",
        }}
      >
        ❌ Your browser does not support notifications.
      </div>
    );
  }

  if (permission === "granted") return null;

  return (
    <div
      style={{
        background: "#fff8d6",
        borderBottom: "1px solid #ffe58f",
        padding: "12px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <span style={{ textAlign: "center" }}>
        🔔 Enable notifications to get instant alerts.
      </span>

      <button
        onClick={requestPermission}
        style={{
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 12px",
          cursor: "pointer",
          fontWeight: 500,
        }}
      >
        Enable Notifications
      </button>

      {permission === "denied" && (
        <div style={{ marginTop: 8, fontSize: 13, color: "#444", textAlign: "center" }}>
          <div style={{ marginBottom: 4 }}>🔒 Notifications are blocked. Please enable them manually:</div>
          {renderInstructions()}
        </div>
      )}
    </div>
  );
};

export default NotificationPermissionBanner;

export const notifyUser = (title: string, body?: string) => {
  if ("Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(title, {
        body: body || "",
        icon: "/favicon.png",
      });
    } else {
      console.warn("Notification not permitted:", Notification.permission);
    }
  }
};

