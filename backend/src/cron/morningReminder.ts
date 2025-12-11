import cron from "node-cron";
import { loadTemplate, transporter } from "./mailer.js";
import { User } from "../models/User.js";
import path from "path";

const sendMailToUsers = async (users: any[]) => {
  const templatePath = path.join(process.cwd(),"src", "templates", "reminderMail.html");
  console.log(templatePath);
  
  for (let user of users) {
    const htmlContent = loadTemplate(templatePath, {
      user: user.username,
      FRONTEND_URL: process.env.FRONTEND_URL ?? "",
      YEAR: new Date().getFullYear().toString(),
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: user.email,
      subject: "Daily Notification",
      html: htmlContent,
    });
  }
};

cron.schedule("0 15 * * 1-5", async () => {
  try {
    const users = await User.find({role:{$in:["teamLead","user"]}});
    
    await sendMailToUsers(users);

} catch (error) {
    console.error("❌ Error sending emails:", error);
  }
},{
   timezone:"Asia/Kolkata"
});
