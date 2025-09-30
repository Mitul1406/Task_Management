import mongoose from "mongoose";

export const connectDb = async ()=>{
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/tasktracker")
        console.log("Connected to DB......")
        
    }catch(err){
          console.log("Something went wrong...",err);
          
    }
}