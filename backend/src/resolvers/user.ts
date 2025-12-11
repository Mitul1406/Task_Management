import path from "path";
import fs from "fs";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import nodemailer from "nodemailer";
import { Project } from "../models/Project.js";
import mongoose from "mongoose";
import pdf from "html-pdf-node";
import { taskResolver } from "./taskResolvers.js";
import { simpleQueue } from "../queue/simpleQueue.js";

const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
    });

const sendResetPasswordMail = async (email: string, token: string, username: string) => {
  try {
    const templatePath = path.join(process.cwd(), "src", "templates", "tasktracker-reset-user.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    htmlTemplate = htmlTemplate
      .replace("{{RESET_LINK}}", resetLink)
      .replace("{{YEAR}}", new Date().getFullYear().toString())
      .replace("{{user}}", username);   

    await transporter.sendMail({
      from: `"Task Tracker" <${process.env.EMAIL}>`,
      to: email,
      subject: "🔐 Task Tracker - Reset Your Password",
      html: htmlTemplate,
    });
  } catch (err) {
    throw new Error("Failed to send reset email");
  }
};

const transformData = (data: any) => {
  if (!data) return [];

  const { projects = [], dayWise = [] } = data;

  // Map task IDs to project names
  const taskToProjectMap: Record<string, string> = {};
  projects.forEach((project: any) => {
    (project.tasks || []).forEach((task: any) => {
      taskToProjectMap[task.id] = project.name;
    });
  });

  // Flatten dayWise tasks and add projectName
  const tasksWithProjectName = dayWise.flatMap((day: any) => {
    return (day.tasks || []).map((task: any) => ({
      ...task,
      projectName: taskToProjectMap[task.taskId] || "Unknown Project",
    }));
  });

  return tasksWithProjectName;
};

const sendMailToTeamLeads = async ({ userId }: { userId: string }) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    const teamLeads = await User.find({ _id: { $in: user.teamLeads } });
    const toEmails = teamLeads.map(tl => tl.email);

    const today:any = new Date().toISOString().split("T")[0];
    const subject = `${user.username}'s Today Tasks -> ${today}`;
    const message = `Today's Summary.`;

    const userDayWiseData = await taskResolver.userDayWise({
      userId,
      startDate: today,
      endDate: today,
    });

    const tasks = await transformData(userDayWiseData);

    const pdfPath = await generateDaywisePdf(user.username, today, tasks);

    await transporter.sendMail({
      from: user.username,
      replyTo: user.email,
      to: toEmails.join(", "),
      subject,
      text: message,
      attachments: [
        {
          filename: `report-${today}.pdf`,
          path: pdfPath,
        },
      ],
    });

  } catch (err) {
    console.error("Failed to send queued email:", err);
  }
};


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

const generateDaywisePdf = async (
  username: string,
  date: string,
  tasks: any[]
) => {  
  const templatePath = path.join(process.cwd(), "src", "templates", "daywise-report.html");
  let html = fs.readFileSync(templatePath, "utf-8");
  
  const statusColors: Record<string, string> = {
  in_progress: "#4b0867ff",
  done: "#2bc22bff",   
  pending: "#064393ff", 
  code_review:"#a1dcaeff"
};
  const rows = tasks
  .map((t: any) => {
    const statusBg = statusColors[t.status] || statusColors.default; // pick color based on task status
    return `
      <tr>
        <td>${t.projectName}</td>
        <td>${t.title}</td>
        <td>
          <span style="background:${statusBg};padding:4px 8px;border-radius:5px;color:white">
            ${t.status.replace("_", " ")}
          </span>
        </td>
        <td>${formatTime(t.time)}</td>
        <td>${formatTime(t.estimatedTime)}</td>
        <td style="color:green">${formatTime(t.savedTime)}</td>
        <td style="color:red">${formatTime(t.overtime)}</td>
      </tr>
    `;
  })
  .join("");

  html = html
    .replace("{{username}}", username)
    .replace("{{date}}", date)
    .replace("{{rows}}", rows);

  const outputPath = path.join(process.cwd(),"report", `daywise-report-${date}.pdf`);

  const file = { content: html };

  const pdfBuffer:any = await pdf.generatePdf(file, {
    format: "A4",
    printBackground: true,
    margin: { top: "20px", bottom: "20px" },
  });

  fs.writeFileSync(outputPath, pdfBuffer);
  return outputPath;
};

export const userResolver = {

user:async({ userId }: { userId: string }) => {
  const user = await User.findById(userId)
    .select("id username email")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id:user._id,
    username:user.username,
    email:user.email,
    role:user.role 
  };
},

allusers: async () => {
      const users = await User.find({role:{$in:["teamLead","user"]}});
      return users.map((u) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }));
},

// empGet:async({userId}:{userId:string})=>{ 
//    const users = await User.find({
    
//     $or: [
//       { role: "user" },
//       { _id: new mongoose.Types.ObjectId(userId) }
//     ]
//   });
   
//       return users.map((u) => ({
//         id: (u as any)._id.toString(),
//         username: u.username,
//         email: u.email,
//         role: u.role,
//       }));
// },

empGet:async({userId}:{userId:string})=>{ 
   const users = await User.find({
    
    $or: [
      { role: "user",teamLeads: userId },
      { _id: new mongoose.Types.ObjectId(userId) }
    ]
  });
   
      return users.map((u) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }));
},

getTeamLead:async({id}:{id:string})=>{
   let users:any=await User.find({ role: {$in:["teamLead","superAdmin"]}})
   if (id) {
    users = users.filter((u: any) => u._id.toString() !== id);
  }

   return users.map((u:any) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }));
},

getUserTeamLead:async({id}:{id:string})=>{
  
   const user:any=await User.findById(id)
   const users:any = await User.find({_id:{$in:user.teamLeads}})
   return users.map((u:any) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }))
},

getUserRelations: async ({ id }:{id:string}) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return {
        role: "",
        teamLeads: [],
        employees: [],
        message: "User not found"
      };
    }

    if (user.role === "teamLead") {
      const employees = await User.find({ teamLeads: id });
      const teamLeads = await User.find({ _id : {$in : user.teamLeads} });

      return {
        role: "teamLead",
        employees,
        teamLeads,
      };
    }

    if (user.role === "employee" || user.role === "user") {
      const teamLeads = await User.find({ _id: { $in: user.teamLeads } });

      return {
        role: "employee",
        teamLeads,
        employees: []
      };
    }

    return {
      role: user.role,
      employees: [],
      teamLeads: []
    };

  } catch (err) {
    console.error(err);
    return {
      role: "",
      employees: [],
      teamLeads: []
    };
  }
},

createUser: async (
  { username, email, role,teamLeads }: { username: string; email: string; role?: string,teamLeads?: string[] }
) => {
  try {
    const existing = await User.findOne({ email });
    
    if (existing) {
      return {
        success: false,
        message: "Email already exists",
      };
    }

    const newUser:any = new User({
      username,
      email,
      password: "", 
      role: role || "user",
      teamLeads: teamLeads || [],
    });

    const resetToken = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

    newUser.resetToken = resetToken;
newUser.resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
await newUser.save();

    await sendResetPasswordMail(newUser.email, resetToken, newUser.username);

    return {
      success: true,
      message: "User created successfully. Reset password email sent.",
      user: newUser,
    };
  } catch (err: any) {
    console.error("Error creating user:", err);
    return {
      success: false,
      message: err.message || "Failed to create user",
    };
  }
},

updateUser: async (
  { id, username, email, role,teamLeads }: { id: string; username?: string; email?: string; role?: string;teamLeads?:string[] }
) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return {
          success: false,
          message: "Email already exists",
        };
      }
      user.email = email;
    }

    if (username) user.username = username;
    if (role) user.role = role;
    if (teamLeads) {
      user.teamLeads = teamLeads.map(id => new mongoose.Types.ObjectId(id));
    }

    await user.save();

    return {
      success: true,
      message: "User updated successfully",
      user,
    };
  } catch (err: any) {
    console.error("Error updating user:", err);
    return {
      success: false,
      message: err.message || "Failed to update user",
    };
  }
},

deleteUser: async ({ id }: { id: string }) => {
  try {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new Error("User not found");
    const userRole=user.role
    if (userRole === "teamLead") {
      await User.updateMany(
        { teamLeads: id },
        { $pull: { teamLeads: id } }
      );
    }

    const userProjects = await Project.find({ adminId: id });
    const userProjectIds = userProjects.map((p) => p._id);

    const userTasks = await Task.find({
      $or: [
        { assignedUserId: id }, 
        { projectId: { $in: userProjectIds } },
      ],
    });

    const taskIds = userTasks.map((t) => t._id);

    if (taskIds.length > 0) {
      await Timer.deleteMany({ taskId: { $in: taskIds } });
    }

    if (taskIds.length > 0) {
      await Task.deleteMany({ _id: { $in: taskIds } });
    }

    if (userProjectIds.length > 0) {
      await Project.deleteMany({ _id: { $in: userProjectIds } });
    }

    return {
      message:
        "User, their projects, assigned/created tasks, and timers deleted successfully",
    };
  } catch (err: any) {
    console.error("Error deleting user and related data:", err);
    throw new Error(err.message || "Failed to delete user and related data");
  }
},

changePassword: async (
  { id, oldPassword, newPassword }: { id: string; oldPassword: string; newPassword: string }
) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return { success: false, message: "User not found" };
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return { success: false, message: "Incorrect old password" };
    }

    if (oldPassword === newPassword) {
      return { success: false, message: "New password cannot be same as old password" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { success: true, message: "Password updated successfully" };
  } catch (err: any) {
    console.error("Change password error:", err);
    return { success: false, message: "Failed to change password" };
  }
},

sendMailToTeamLeads: async ({ userId }: any) => {
  simpleQueue.addJob(sendMailToTeamLeads, { userId });

  return {
    success: true,
    message: "Daily task update email sended to Team Leads",
  };
}

};
