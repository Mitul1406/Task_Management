import { Task } from "../models/Task.js";
import { Timer } from "../models/Timer.js";
import { User } from "../models/User.js";
import bcrypt from "bcryptjs";

export const userResolver = {

    user: async (_: any, { id }: { id: string }) => {
      try {
        const user = await User.findById(id);
        if (!user) throw new Error("User not found");
        return user;
      } catch (err) {
        throw new Error("Failed to fetch user");
      }
    },
    createUser: async (
      { username, email, password, role }: { username: string; email: string; password: string; role?: string }
    ) => {
      try {
        const existing = await User.findOne({ email });
        if (existing) throw new Error("Email already exists");

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
          username,
          email,
          password: hashedPassword,
          role: role || "user",
        });

        await newUser.save();
        return newUser;
      } catch (err: any) {
        throw new Error(err.message || "Failed to create user");
      }
    },

    updateUser: async (
  { id, username, email, role }: { id: string; username?: string; email?: string; role?: string }
) => {
  try {

    const user = await User.findById(id);
    if (!user) throw new Error("User not found");

    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;

    await user.save();
    return user;
  } catch (err: any) {
    throw new Error(err.message || "Failed to update user");
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
