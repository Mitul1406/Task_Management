import path from "path";
import fs from "fs";
import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken'
import nodemailer from "nodemailer";

const sendResetPasswordMail = async (email: string, token: string, username: string) => {
  try {
    const templatePath = path.join(process.cwd(), "src", "templates", "tasktracker-reset-user.html");
    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    const resetLink = `http://localhost:3000/reset-password/${token}`;

    htmlTemplate = htmlTemplate
      .replace("{{RESET_LINK}}", resetLink)
      .replace("{{YEAR}}", new Date().getFullYear().toString())
      .replace("{{user}}", username);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
    });

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

export const userResolver = {
allusers: async () => {
      const users = await User.find({role:{$in:["admin","user"]}});
      return users.map((u) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }));
    },
createUser: async (
  { username, email, role }: { username: string; email: string; role?: string }
) => {
  try {
    const existing = await User.findOne({ email });
    console.log();
    
    if (existing) {
      return {
        success: false,
        message: "Email already exists",
      };
    }

    const newUser = new User({
      username,
      email,
      password: "", // password will be set via reset link
      role: role || "user",
    });

    (await newUser.save()).populate("user");

    const resetToken = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" }
    );

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
  { id, username, email, role }: { id: string; username?: string; email?: string; role?: string }
) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return {
        success: false,
        message: "User not found",
      };
    }

    // Check if the new email already exists in another user
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

    const tasks = await Task.find({ userId: id });

    const taskIds = tasks.map((task) => task._id);
    if (taskIds.length > 0) {
      await Timer.deleteMany({ taskId: { $in: taskIds } });
    }

    await Task.deleteMany({ userId: id });

    return { message: "User, their tasks, and timers deleted successfully" };
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
        if (!user) throw new Error("User not found");

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) throw new Error("Incorrect old password");

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await user.save();

        return { message: "Password updated successfully" };
      } catch (err: any) {
        throw new Error(err.message || "Failed to change password");
      }
},


};
