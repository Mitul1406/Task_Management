import path from "path";
import { User } from "../models/User.js";
import { loadTemplate, transporter } from "./mailer.js";
import Cron from "node-cron";
import { buildEmployeeRows, buildEmployeeSection } from "../utils/emailBuilders.js";
import { taskResolver } from "../resolvers/taskResolvers.js";

const transformData = (data: any, todayDate: string) => {
  if (!data) return [];
  
  const { projects = [], dayWise = [] } = data;
  
  const taskToProjectMap: Record<string, string> = {};
  projects.forEach((project: { tasks: any; name: string; }) => {
    (project.tasks || []).forEach((task: { id: string | number; }) => {
      taskToProjectMap[task.id] = project.name;
    });
  });

//   return dayWise.flatMap((day: { tasks: any; }) =>
//     (day.tasks || []).map((task: { taskId: string | number; createdAt: string; }) => ({
//       ...task,
//       projectName: taskToProjectMap[task.taskId] || "Unknown Project",
//       todayTask: task.createdAt?.split("T")[0] === todayDate ? "Yes" : "No",
//     }))
//   );

return dayWise.flatMap((day: { tasks: any; date?: string }) => {

    return (day.tasks || []).map((task: any) => ({
      ...task,
      projectName: taskToProjectMap[task.taskId] || "Unknown Project",
      todayTask: (() => {
  if (!task.createdAt) return "No";
  const taskDateStr = new Date(task.createdAt).toISOString().split("T")[0];
  return taskDateStr === todayDate ? "Yes" : "No";
})(),

    }));
  });
};

const sendDailySummaryToTeamLeads = async () => {
  try {
    const today:any = new Date().toISOString().split("T")[0];

    const teamLeads = await User.find({ role: {$in:["teamLead"]} });

    for (const lead of teamLeads) {
      const employees = await User.find({ teamLeads: lead._id });

      let employeesHtml = "";

      for (const emp of employees) {
        const data = await taskResolver.userDayWise({
          userId: (emp as any)._id.toString(),
          startDate: today,
          endDate: today,
        });

        const tasks = transformData(data, today);
        const rowsHtml = buildEmployeeRows(tasks);
        const sectionHtml = buildEmployeeSection(emp.username, rowsHtml);

        employeesHtml += sectionHtml;
      }

      const templatePath = path.join(process.cwd(),"src","templates","teamLeadDailySummary.html");

      const html = loadTemplate(templatePath, {
        date: today,
        employees: employeesHtml,
      });

      await transporter.sendMail({
        from: process.env.EMAIL,
        to: lead.email,
        subject: `Your Team’s Task Update – ${today}`,
        html,
      });

    }
  } catch (err) {
    console.error("Error sending team lead summary:", err);
  }
};

const sendDailySummaryToSuperAdmin = async () => {
  try {
    const today: any = new Date().toISOString().split("T")[0];

    const teamLeads = await User.find({ role: { $in: ["teamLead"] } });

    let finalSummary = "";

    for (const tl of teamLeads) {
      const tlData = await taskResolver.userDayWise({
        userId: (tl as any)._id.toString(),
        startDate: today,
        endDate: today,
      });

      const tlTasks = transformData(tlData, today);
      const tlRows = buildEmployeeRows(tlTasks);

      let block = `
        <div class="employee-section">
          <h2>TeamLead: ${tl.username}</h2>
          ${buildEmployeeSection(`${tl.username}'s Tasks`, tlRows)}
      `;

      const employees = await User.find({ teamLeads: tl._id });

      for (const emp of employees) {
        const empData = await taskResolver.userDayWise({
          userId: (emp as any)._id.toString(),
          startDate: today,
          endDate: today,
        });

        const empTasks = transformData(empData, today);
        const empRows = buildEmployeeRows(empTasks);

        block += buildEmployeeSection(emp.username, empRows);
      }

      block += `</div>`; // close tl-block
      finalSummary += block;
    }

    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "SuperAdminDailySummary.html"
    );

    const html = loadTemplate(templatePath, {
      date: today,
      summary: finalSummary,
    });

    const superAdmins = await User.find({ role: "superAdmin" });
    for (const admin of superAdmins) {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: admin.email,
        subject: `Team's Task Update – ${today}`,
        html,
      });
    }
  } catch (err) {
    console.error("Error sending superAdmin summary:", err);
  }
};

Cron.schedule(process.env.NIGHT_TASK_UPDATE_CRON!, () => {
  sendDailySummaryToTeamLeads();
  sendDailySummaryToSuperAdmin();
}, {
  timezone: "Asia/Kolkata"
});