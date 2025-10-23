import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { createTaskAdmin } from "../services/api";
import { jwtDecode } from "jwt-decode";

interface CreateTaskModalProps {
  show: boolean;
  onClose: () => void;
}

interface JwtPayload {
  id: string;
  username?: string;
  email?: string;
  iat?: number;
  exp?: number;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ show, onClose }) => {
  const [title, setTitle] = useState("");
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  
  const todayDate = () => new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState(todayDate());
  const [loading, setLoading] = useState(false);

  // Error states
  const [titleError, setTitleError] = useState("");
  const [dateError, setDateError] = useState("");
  const [durationError, setDurationError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  const getUserIdFromToken = () => {
    const token = localStorage.getItem("token");
    if (!token) return undefined;
    try {
      const decoded: JwtPayload = jwtDecode(token);
      return decoded.id;
    } catch (err) {
      console.error("Invalid token", err);
      return undefined;
    }
  };

  useEffect(() => {
    const modalEl = modalRef.current;
    if (!modalEl) return;

    if (show) {
      modalEl.style.display = "block";
      modalEl.classList.add("show");
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
    } else {
      modalEl.style.display = "none";
      modalEl.classList.remove("show");
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      setTitleError("");
      setDateError("");
      setDurationError("");
    }
  }, [show]);
  
   const handleClose = ()=> onClose()
  // Real-time validation handlers
  const handleTitleChange = (value: string) => {
    setTitle(value);
    setTitleError(value.trim() ? "" : "Task name is required");
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (!value || !endDate) {
      setDateError("Start and End dates are required");
    } else if (endDate < value) {
      setDateError("End date cannot be before Start date");
    } else {
      setDateError("");
    }
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (!startDate || !value) {
      setDateError("Start and End dates are required");
    } else if (value < startDate) {
      setDateError("End date cannot be before Start date");
    } else {
      setDateError("");
    }
  };

  const handleDurationChange = (hours: number, minutes: number, seconds: number) => {
    setEstimatedHours(hours);
    setEstimatedMinutes(minutes);
    setEstimatedSeconds(seconds);

    if (hours + minutes + seconds <= 0) {
      setDurationError("Estimated duration must be greater than 0");
    } else {
      setDurationError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;

    if (!title.trim()) {
      setTitleError("Task name is required");
      valid = false;
    }

    if (!startDate || !endDate) {
      setDateError("Start and End dates are required");
      valid = false;
    } else if (endDate < startDate) {
      setDateError("End date cannot be before Start date");
      valid = false;
    }

    if (estimatedHours + estimatedMinutes + estimatedSeconds <= 0) {
      setDurationError("Estimated duration must be greater than 0");
      valid = false;
    }

    if (!valid) return;

    const assignedUserId = getUserIdFromToken();
    const totalEstimatedTime =
      estimatedHours * 3600 + estimatedMinutes * 60 + estimatedSeconds;

    try {
      setLoading(true);
      const task = await createTaskAdmin(
        "",
        title,
        totalEstimatedTime,
        assignedUserId,
        startDate,
        endDate
      );

      toast.success(`Task "${task.title}" created successfully!`);
      handleClose();

      setTitle("");
      setEstimatedHours(0);
      setEstimatedMinutes(0);
      setEstimatedSeconds(0);
      setStartDate("");
      setEndDate("");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      tabIndex={-1}
      ref={modalRef}
      role="dialog"
      style={{ display: "none" }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ width: "450px" }} role="document">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Create Your Own Task</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
            </div>

            <div className="modal-body">
              {/* Task Name */}
              <div className="mb-3">
                <label className="form-label">Task Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter task name"
                />
                {titleError && <small className="text-danger">{titleError}</small>}
              </div>

              {/* Estimated Duration */}
              <div className="mb-3">
                <label className="form-label">Estimated Duration</label>
                <div className="d-flex gap-2">
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    value={estimatedHours}
                    onChange={(e) =>
                      handleDurationChange(Number(e.target.value), estimatedMinutes, estimatedSeconds)
                    }
                    placeholder="Hours"
                  />
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={59}
                    value={estimatedMinutes}
                    onChange={(e) =>
                      handleDurationChange(estimatedHours, Number(e.target.value), estimatedSeconds)
                    }
                    placeholder="Minutes"
                  />
                  <input
                    type="number"
                    className="form-control"
                    min={0}
                    max={59}
                    value={estimatedSeconds}
                    onChange={(e) =>
                      handleDurationChange(estimatedHours, estimatedMinutes, Number(e.target.value))
                    }
                    placeholder="Seconds"
                  />
                </div>
                {durationError && <small className="text-danger">{durationError}</small>}
              </div>

              {/* Start & End Dates */}
              <div className="d-flex gap-2">
                <div className="flex-1">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="form-control"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                  />
                </div>
              </div>
              {dateError && <small className="text-danger">{dateError}</small>}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;
