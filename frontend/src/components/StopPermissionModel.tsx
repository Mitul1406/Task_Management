import React from "react";

interface StopPermissionModalProps {
  show: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const StopPermissionModal: React.FC<StopPermissionModalProps> = ({
  show,
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
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
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          padding: "24px 30px",
          maxWidth: "420px",
          width: "90%",
          textAlign: "center",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
          animation: "fadeIn 0.2s ease-in-out",
        }}
      >
        <h4 style={{ marginBottom: "14px", color: "#333" }}>
          🖥️ Stop Screen Sharing?
        </h4>
        <p style={{ fontSize: "15px", color: "#555" }}>
          You’ve stopped all running tasks.
          <br />
          Do you also want to stop screen sharing permission?
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            marginTop: "22px",
          }}
        >
            <button
            onClick={onCancel}
            style={{
              background: "#6c757d",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              transition: "background 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#565e64")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#6c757d")}
          >
            Keep Sharing
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: "#dc3545",
              color: "#fff",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              transition: "background 0.2s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#b02a37")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#dc3545")}
          >
            Yes, Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopPermissionModal;
