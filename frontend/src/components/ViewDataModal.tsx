import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ViewDataModalProps {
  open: boolean;
  onClose: () => void;   
  data?: any;              
}


function ViewDataModal({ open, onClose, data }:ViewDataModalProps) {
  const navigate=useNavigate()
  const [loggedInRole,setLoggedInRole]=useState("")
  useEffect(()=>{
    const token:any = localStorage.getItem("token")
    const parsed:any = jwtDecode(token)
    setLoggedInRole(parsed.role)
  },[])
  if (!open) return null;
  const role = data?.role;
  const employees = data?.employees || [];
  const teamLeads = data?.teamLeads || [];
  
  return (
    <div className="modal-backdrop">
  <div className="modal-card main-color">
    <h2 className="modal-title">Team Hierarchy</h2>

    <p><strong>Role:</strong> {role === "employee" ? "Employee" : "Team Leader"}</p>

    {teamLeads.length > 0 && (
      <>
        <h3>Team Leads</h3>
        <ul
  style={{
    listStyle: "none",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    paddingLeft: 0,
  }}
>
  {teamLeads.map((tl: any) => (
    <li key={tl.id}>
      {(tl.role !== "superAdmin" && loggedInRole!=="teamLead") ? (
        <div
          onClick={() => {
            onClose();
            navigate(`/userView?name=${tl.username}&role=${tl.role}`);
          }}
          className="pill d-flex justify-content-center "
          style={{cursor:"pointer"}}

        >
          {tl.username}
        </div>
      ) : (
        <div 
          className="pill d-flex justify-content-center">{tl.username}</div>
      )}
    </li>
  ))}
</ul>

      </>
    )}

    {role === "teamLead" && (
      <>
        <h3>Employees</h3>
        {employees.length === 0 ? (
          <p>No employees found</p>
        ) : (
          <ul
  style={{
    listStyle: "none",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    paddingLeft: "0"
  }}
>
  {employees.map((emp: any) => (
    <li key={emp.id}>
      {role !== "superAdmin" ? (
        <div
          onClick={() => {
            onClose();
            navigate(`/userView?name=${emp.username}&role=${emp.role}`);
          }}
          className="pill d-flex justify-content-center"
          style={{cursor:"pointer"}}
        >
          {emp.username}
        </div>
      ) : (
        <div 
          className="pill d-flex justify-content-center">{emp.username}</div>
      )}
    </li>
  ))}
</ul>

        )}
      </>
    )}

    <button className="close-btn" onClick={onClose}>Close</button>
  </div>

  <style>{`
    .modal-backdrop {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0,0,0,0.4);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .modal-card {
      width: 400px;
      background: white;
      padding: 20px;
      border-radius: 8px;
    }

    .link-item {
      color: blue;
      cursor: pointer;
      text-decoration: underline;
    }

    .close-btn {
      margin-top: 20px;
      padding: 8px 16px;
      background: black;
      color: white;
      border: none;
      border-radius: 4px;
    }
  `}</style>
</div>

  );
}

export default ViewDataModal;
