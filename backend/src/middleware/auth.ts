import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { User } from "../models/User.js";
dotenv.config();
const secret = process.env.JWT_SECRET!;

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async(req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1] || "";

  if (!secret) {
    res.status(500).json({ message: "JWT secret not configured" });
    return;
  }

  try {
    const decoded:any = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401).json({ message: "User no longer exists" });
      return;
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send("Unauthorized");
  }
};
