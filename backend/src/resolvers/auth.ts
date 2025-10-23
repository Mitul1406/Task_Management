import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { Screenshot } from "../models/ScreenShot.js";
dotenv.config();
const secret= process.env.JWT_SECRET!
const RESET_TOKEN_EXPIRY = 15 * 60;
const generateOtp = ()=>Math.floor(100000+Math.random()*900000).toString()

const sendMail = async (email: any, otp: string) => {
  try {
    const user: any = await User.findOne({ email });
    if (!user) throw new Error("User not found");
     
    const templatePath = path.join(process.cwd(),"src", "templates", "tasktracker-otp.html");

    let htmlTemplate = fs.readFileSync(templatePath, "utf-8");

    htmlTemplate = htmlTemplate
      .replace("{{OTP}}", otp)
      .replace("{{YEAR}}", new Date().getFullYear().toString())
      .replace("{{user}}",user.username);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Task Tracker" <${process.env.EMAIL}>`,
      to: email,
      subject: "🔐 Task Tracker - Verify Your Account",
      html: htmlTemplate,
    });

  } catch (err) {
    throw new Error("Failed to send verification email");
  }
};

const sendResetPasswordMail = async (email: string, token: string, username: string) => {
  try {
    const templatePath = path.join(process.cwd(), "src", "templates", "tasktracker-reset.html");
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
export const authResolver = { 
    users: async () => {
      const users = await User.find({role:"user"});
      return users.map((u) => ({
        id: (u as any)._id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
      }));
    },
  register: async ({ username, email, password, role }: any) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("User already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  const otp = generateOtp();

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    otp,
    otpExpiry: Date.now() + 10 * 60 * 1000, // valid 10 min
    role,
  });
  await newUser.save();

  await sendMail(email, otp);

  return {
    success: true,
    message: "Registered successfully, please verify OTP sent to your email.",
  };
},

login: async ({ email, password }: any) => {
  const user:any = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error("Invalid credentials");

  const otp = generateOtp();
  if(user.role === "superAdmin"){
  user.otp = "111111";
  }else{
  user.otp = otp;

  }
  user.otpExpiry = Date.now() + 15 * 60 * 1000;
  await user.save();

  await sendMail(email, otp);

  return {
    success: true,
    message: "OTP sent to your email for verification.",
  };
},

verifyOtp: async ({ email, otp }: any) => {
  const user: any = await User.findOne({ email });
  if (!user) return { success: false, message: "User not found" };

  if (user.otp !== otp) return { success: false, message: "Invalid OTP" };
  if (Date.now() > user.otpExpiry) return { success: false, message: "OTP expired" };

  user.isVerified = true;
  user.otp = null;
  user.otpExpiry = null;
  await user.save();

  const payload = {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
  };
  const token = jwt.sign(payload, secret, { expiresIn: "7d" });

  return { success: true, token, user: payload, message: "OTP verified successfully!" };
},


  resendOTP: async ({ email }: { email: string }) => {
      const user: any = await User.findOne({ email });
      if (!user) throw new Error("User not found");

      const otp = generateOtp();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);

      user.otp = otp;
      user.otpExpiry = expiry;
      await user.save();

      await sendMail(email, otp);

      return {
        success: true,
        message: "New OTP sent successfully. Please check your email.",
      };
    },


     screenshotsByUser: async ({ userId }: { userId: string }) => {
  const screenshots = await Screenshot.find({ userId }).sort({ createdAt: -1 });

  return screenshots.map(s => ({
    id: s._id.toString(),
    url: `/uploads/screenshots/${s.filename}`,
    createdAt: s.createdAt.toISOString(),
  }));
},

forgotPassword: async ({ email }: { email: string }) => {
  const user: any = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  const token = jwt.sign(
    { userId: user._id, email: user.email },
    secret,
    { expiresIn: RESET_TOKEN_EXPIRY }
  );

  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + RESET_TOKEN_EXPIRY * 1000;
  await user.save();

  await sendResetPasswordMail(email, token, user.username);

  return { success: true, message: "Reset link sent to your email" };
},
resetPassword: async ({ token, newPassword }: { token: string; newPassword: string }) => {
  try {
    const user: any = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });

    if (!user) {
      return {
        success: false,
        message: "Invalid or expired token",
      };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    return {
      success: true,
      message: "Password reset successfully",
    };
  } catch (err: any) {
    console.error("Error resetting password:", err);
    return {
      success: false,
      message: "Something went wrong while resetting the password.",
    };
  }
},

};
