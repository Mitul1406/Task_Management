const formatTime = (seconds: number) => {
  if (!seconds || seconds <= 0) return "-";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  let result = "";
  if (h > 0) result += `${h}h `;
  if (m > 0) result += `${m}m `;
  if (s > 0) result += `${s}s`;

  return result.trim();
};

const statusColors: Record<string, string> = {
  in_progress: "#4b0867ff",
  done: "#2bc22bff",   
  pending: "#064393ff", 
  code_review:"#a1dcaeff"
};

export const buildEmployeeRows = (tasks: any[]) => {
  return tasks
    .map(
      (t) => {        
        const statusBg = statusColors[t.status] || statusColors.default;
        const bgToday = t.todayTask === "Yes"?"background: #f0f0f0;":"";
        return`
        <tr>
          <td>${t.projectName}</td>
          <td>${t.title}</td>
          <td>${formatTime(t.estimatedTime) || 0}</td>
          <td>${formatTime(t.time) || 0}</td>
          <td style="color:green">${formatTime(t.savedTime) || 0}</td>
          <td style="color:red">${formatTime(t.overtime) || 0}</td>
          <td style="background:${statusBg}">
          <span style="padding:4px 8px;border-radius:5px;color:white">
            ${t.status.replace("_", " ")}
          </span></td>
          <td style="${bgToday}">${t.todayTask}</td>
        </tr>`}
    )
    .join("");
};

export const buildEmployeeSection = (username: string, rowsHtml: string) => {
  return `
    <div class="employee-section">
      <h2>${username}</h2>

      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Task</th>
            <th>Estimated</th>
            <th>Time Used</th>
            <th>Saved</th>
            <th>Extended Time</th>
            <th>Status</th>
            <th>Today Task</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>`;
};
