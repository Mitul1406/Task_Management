import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
dotenv.config();
const secret= process.env.JWT_SECRET!
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

      const newUser = new User({ username, email, password: hashedPassword, ...(role ? { role } : {}), });
      await newUser.save();

      return {
    id: (newUser as any)._id.toString(),
    username: newUser.username,
    email: newUser.email,
    role: newUser.role,
    message:"Registered successfully, please login..."
  };
    },

    login: async ({ email, password }: any) => {
  try {
    const user = await User.findOne({ email });
    if (!user) throw new Error("Invalid credentials");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error("Invalid credentials");

    const payload = {
      id: (user as any)._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    return { ...payload, token,message:"Login SuccessFully...." };
  } catch (err) {
    console.error("Login error:", err);
    throw new Error((err as any).message || "Something went wrong");
  }
},

};
