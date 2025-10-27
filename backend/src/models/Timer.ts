import mongoose, { Document, Schema } from "mongoose";
import type { ITask } from "./Task";

export interface ITimer extends Document {
  taskId: ITask["_id"];
  userId: string;         // <-- Add this
  startTime: Date;
  endTime: Date;
  duration?: number;
}

const timerSchema = new Schema(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // <-- store who worked
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
  },
  { timestamps: true }
);

export const Timer = mongoose.model<ITimer>("Timer", timerSchema);
