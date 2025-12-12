import path from "path";
import Cron from "node-cron";
import { User } from "../models/User.js";

import { taskResolver } from "../resolvers/taskResolvers.js";
import { loadTemplate, transporter } from "./mailer.js";


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

const buildProjectHtml = (tasks: any[]) => {
  if (!tasks?.length) {
    return `<p style="color:#999;">No tasks found.</p>`;
  }

  let html = `
    <div style="overflow-x:auto; width:100%;">
      <table width="100%" border="1" cellspacing="0" cellpadding="6"
        style="border-collapse: collapse; font-size: 14px; margin-bottom:20px; min-width: 500px;">
        <tr style="background:#f0f0f0;">
          <th style="width:15%; text-align:left;">Project</th>
          <th style="width:20%; text-align:left;">Task</th>
          <th style="width:15%; text-align:left;">Estimated</th>
          <th style="width:15%; text-align:left;">Previously Worked</th>
          <th style="width:15%; text-align:left;">Status</th>
          <th style="width:20%; text-align:left;">Today Task</th>
        </tr>
  `;

  for (const t of tasks) {
    const statusBg = statusColors[t.status] || statusColors.default;
    const bgToday = t.todayTask === "Yes" ? "background: #f0f0f0;" : "";
    html += `
      <tr>
        <td>${t.projectName || "-"}</td>
        <td>${t.title}</td>
        <td>${formatTime(t.estimatedTime)}</td>
        <td>${formatTime(t.totalTime)}</td>
        <td style="background:${statusBg}; text-align:center;">
          <span style="padding:4px 8px;border-radius:5px;color:white;display:inline-block;">
            ${t.status.replace("_", " ")}
          </span>
        </td>
        <td style="${bgToday}; text-align:center;">${t.todayTask || "-"}</td>
      </tr>
    `;
  }

  html += `</table></div>`;
  return html;
};

const buildUserBlockHtml = (username: string, projectHtml: string) => {
  return `
    <div style="
      border:1px solid #ccc; 
      padding:15px; 
      margin-bottom:25px; 
      border-radius:8px;
      overflox-x:auto;
    ">
      <h2 style="
        margin-bottom: 10px;
        background: #517ddc;
        padding: 8px;
        color: white;
        display: inline-block;
        border-radius: 6px;
        font-size: 18px;
      ">${username}</h2>
      ${projectHtml}
    </div>
  `;
};


const filterTasksForToday = (projects: any[]) => {

const allTasks = projects.flatMap((p: any) =>
    (p.tasks || []).map((t: any) => ({
      ...t,
      projectName: p.name,
    }))
  );
  const today:any = new Date().toISOString().split("T")[0];

  return allTasks
    .filter(task => {
      if (!task.startDate || !task.endDate) {
        return false;
      }

      const start:any = new Date(task.startDate).toISOString().split("T")[0];
      const end:any = new Date(task.endDate).toISOString().split("T")[0];

      return start <= today && end >= today;
    })
    .map(task => ({
      ...task,
      todayTask:
        new Date(task.createdAt).toISOString().split("T")[0] === today
          ? "Yes"
          : "No"
    }));
};

const sendDailySummaryToTeamLeads = async () => {
  try {
    
    const today:any = new Date().toISOString().split("T")[0];
    const teamLeads = await User.find({ role: "teamLead" });

    for (const lead of teamLeads) {
      const employees = await User.find({ teamLeads: lead._id });

      if (!employees.length) {
        console.log(`Skipped ${lead.username} (No Employees)`);
        continue;
      }

      let employeesHtml = "";

      for (const emp of employees) {
        let projects = await taskResolver.tasksForUser({
          userId: (emp as any)._id.toString(),
        });

        projects = filterTasksForToday(projects)
        
        const projectHtml = buildProjectHtml(projects);
        const blockHtml = buildUserBlockHtml(emp.username, projectHtml);

        employeesHtml += blockHtml;
      }

      const templatePath = path.join(
        process.cwd(),
        "src",
        "templates",
        "teamLeadTasks.html"
      );

      const html = loadTemplate(templatePath, {
        date: today,
        employees: employeesHtml,
        teamLead: lead.username,
      });

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: lead.email,
        subject: `Daily Employee Tasks – ${lead.username}`,
        html,
      });

      console.log(`Team Lead summary sent → ${lead.username}`);
    }
  } catch (err) {
    console.error("Error sending team lead summary:", err);
  }
};

const sendDailySummaryToSuperAdmin = async () => {
  try {
    const today: any = new Date().toISOString().split("T")[0];

    const superAdmins = await User.find({ role: "superAdmin" });
    const teamLeads = await User.find({ role: "teamLead" });

    let leadSummaryHtml = "";    
    let tlEmployeesHtml = "";    

    for (const tl of teamLeads) {
      let tlProjects = await taskResolver.tasksForUser({
        userId: (tl as any)._id.toString(),
      });

      tlProjects = filterTasksForToday(tlProjects);
      const tlProjectHtml = buildProjectHtml(tlProjects);
      leadSummaryHtml += `
        <div class="section">
          <h2>${tl.username}</h2>
          ${tlProjectHtml}
        </div>
      `;

      const employees = await User.find({ teamLeads: tl._id });
      let employeeBlocks = "";

      for (const emp of employees) {
        let empProjects = await taskResolver.tasksForUser({
          userId: (emp as any)._id.toString(),
        });

        empProjects = filterTasksForToday(empProjects);
        const empProjectHtml = buildProjectHtml(empProjects);
        employeeBlocks += buildUserBlockHtml(emp.username, empProjectHtml);
      }

      tlEmployeesHtml += `
          <div class="section">
            <h2>Team Lead:${tl.username}</h2>
            ${employeeBlocks}
          </div>
        `;
    }

    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "superAdminTasks.html"
    );

    const html = loadTemplate(templatePath, {
      date: today,
      leadSummary: leadSummaryHtml,  
      tlEmployees: tlEmployeesHtml,  
    });

    for (const admin of superAdmins) {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: admin.email,
        subject: `SuperAdmin Team Summary – ${today}`,
        html,
      });
      console.log(`SuperAdmin summary sent → ${admin.username}`);
    }
  } catch (err) {
    console.error("Error sending superAdmin summary:", err);
  }
};

Cron.schedule("5 * * * * 1-5", () => {
  console.log("Running Task Summary Cron");
  // sendDailySummaryToTeamLeads();
  // sendDailySummaryToSuperAdmin();
}, {
  timezone: "Asia/Kolkata"
});
