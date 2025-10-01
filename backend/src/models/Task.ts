import mongoose, { Document, Schema } from "mongoose";
import type { IProject } from "./Project";
import type { ITimer } from "./Timer"; // import Timer interface if you have

export interface ITask extends Document {
  projectId: IProject["_id"];
  title: string;
  timers?: ITimer[];  // optional, can be populated dynamically
  createdAt: Date;
  updatedAt: Date;
  totalDuration?: number;
  estimatedTime: number,
  assignedUserId?: string,
}

const taskSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    title: { type: String, required: true },
    estimatedTime: { type: Number, default: 0 },
    assignedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    overtime: { type: Number, default: 0 },    
    savedTime: { type: Number, default: 0 },
  },
  { timestamps: true }
);

taskSchema.virtual("timers", {
  ref: "Timer",
  localField: "_id",
  foreignField: "taskId",
});
taskSchema.virtual("assignedUser", {
  ref: "User",           
  localField: "assignedUserId", 
  foreignField: "_id",   
  justOne: true      
});


taskSchema.set("toJSON", { virtuals: true });
taskSchema.set("toObject", { virtuals: true });

export const Task = mongoose.model<ITask>("Task", taskSchema);
