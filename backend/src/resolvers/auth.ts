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
  user.otp = otp;
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
}


};
