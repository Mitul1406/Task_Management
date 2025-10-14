import React, { useEffect, useState } from "react";
import {jwtDecode} from "jwt-decode";
import { getUserScreenshots } from "../services/api"; // adjust path

function UserScreenShot() {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Extract userId from token
  const token = localStorage.getItem("token");
  let userId = "";
  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      userId = decoded.id || decoded.userId || "";
    } catch (err) {
      console.error("Invalid token:", err);
    }
  }

  const fetchScreenshots = async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getUserScreenshots(userId);
      setScreenshots(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch screenshots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [userId]);

  if (!userId) return <p>Please login to see screenshots.</p>;
  if (loading) return <p>Loading screenshots...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f1f1f1" }}>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>ID</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Screenshot</th>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Created At</th>
          </tr>
        </thead>
        <tbody>
          {screenshots.map((s) => (
            <tr key={s.id}>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>{s.id}</td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                <img
                  src={`http://localhost:4040/${s.filePath}`}
                  alt={`Screenshot ${s.id}`}
                  style={{ width: "250px",height:"250px", borderRadius: "5px" }}
                />
              </td>
              <td style={{ border: "1px solid #ccc", padding: "8px" }}>
  {new Date(s.createdAt?.$date ? s.createdAt.$date : s.createdAt).toLocaleString()}
</td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserScreenShot;
