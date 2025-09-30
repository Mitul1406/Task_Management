import mongoose,{Document,Schema} from "mongoose";
import type {ITask} from "./Task"

export interface ITimer extends Document{
    taskId:ITask["_id"],
    startTime:Date,
    endTime:Date,
    duration?:number
} 


const timerSchema = new Schema({
    taskId:{type: Schema.Types.ObjectId,ref:"Task",required:true},
    startTime:Date,
    endTime:Date,
    duration:Number,
}
,{timestamps:true})

export const Timer = mongoose.model<ITimer>("Timer",timerSchema)