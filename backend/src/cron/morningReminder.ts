import cron from "node-cron";
import { loadTemplate, transporter } from "./mailer.js";
import { User } from "../models/User.js";
import path from "path";

const sendMailToUsers = async (users: any[]) => {
  const templatePath = path.join(process.cwd(),"src", "templates", "reminderMail.html");
  
  for (let user of users) {
    const htmlContent = loadTemplate(templatePath, {
      user: user.username,
      FRONTEND_URL: process.env.FRONTEND_URL ?? "",
      YEAR: new Date().getFullYear().toString(),
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: user.email,
      subject: "Task Tracker Reminder – Start Your Timers & Review Today’s Tasks",
      html: htmlContent,
    });
  }
};

cron.schedule(process.env.MORNING_REMINDER_CRON!, async () => {
  try {    
    const users = await User.find({role:{$in:["teamLead","user"]}});
    
    await sendMailToUsers(users);

} catch (error) {
    console.error("❌ Error sending emails:", error);
  }
},{
   timezone:"Asia/Kolkata"
});
