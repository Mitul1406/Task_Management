import mongoose,{Document,Schema} from "mongoose";

export interface IProject extends Document{
    name?:string,
    description?:string,
    createdAt:Date,
    updatedAt:Date,
    adminId: mongoose.Types.ObjectId;
}

const projectSchema =new Schema({
    name:{type:String,required:true},
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description : String,
},{timestamps:true})

export const Project=mongoose.model<IProject>("Project",projectSchema)
