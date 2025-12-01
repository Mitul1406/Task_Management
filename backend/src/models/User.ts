
import mongoose, { Document, Schema } from "mongoose";

export interface User extends Document{
    username:string,
    email:string,
    role:string,
    password:string,
    teamLeads?:mongoose.Types.ObjectId[],
}

const userSchema:Schema=new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false,default:"" },
  role: { type: String, enum: ["teamLead", "user","superAdmin"], default: "user" },
  otp:String,
  otpExpiry:String,
  isVerified:{type:Boolean,default:false},
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
  
  teamLeads:[{
    type:mongoose.Types.ObjectId,
    ref:"User",
  }]
})

export const User=mongoose.model<User>("User",userSchema)