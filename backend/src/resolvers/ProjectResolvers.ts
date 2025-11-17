import type { Types } from "mongoose"
import {Project} from "../models/Project.js"
import {Task} from "../models/Task.js"
import { Timer } from "../models/Timer.js"
import mongoose from "mongoose";

export const projectResolver ={
    projects:async()=>{
        return await Project.find().populate("adminId")
    },
    project:async({id}:{id:string})=>{
        return await Project.findById(id)
    },

 adminsprojects: async ({ userId }: { userId: string }) => {
  // 1. Get projects where user is admin
  let projects = await Project.find({ adminId: userId })
    .populate("adminId");   // << FULL USER DETAILS

  // 2. Get projects where user is assigned tasks
  const taskProjects = await Task.distinct("projectId", {
    assignedUserId: userId,
  });

  if (taskProjects.length > 0) {
    const assignedProjects = await Project.find({
      _id: { $in: taskProjects },
    }).populate("adminId");          // << populate here also

    assignedProjects.forEach((p) => {
      if (!projects.some((pr: any) => pr._id.equals(p._id))) {
        projects.push(p);
      }
    });
  }

  // 3. Include special project
  const sharedProject = await Project.findOne({ name: "User Created Tasks" })
    .populate("adminId");

  if (sharedProject && !projects.some((p: any) => p._id.equals(sharedProject._id))) {
    projects.push(sharedProject);
  }

  // FINAL: Convert IDs → string
  return projects.map((p: any) => ({
    id: p._id.toString(),
    name: p.name,
    description: p.description,
    createdAt: p.createdAt?.toString(),
    adminId: {
      id: p.adminId._id.toString(),
      username: p.adminId.username,
      email: p.adminId.email,
      role: p.adminId.role,
    }
  }));
},

    createProject: async (
    { name, description }: { name: string; description?: string },
    context: any
  ) => {
    const userId = context.user?.id;
    if (!userId) throw new Error("Unauthorized");

    const project = new Project({
      name,
      description,
      adminId: userId, 
    });

    return (await project.save()).populate("adminId");
  },
    updateProject:async({id,name,description}:{id:string,name:string,description:string})=>{
        const project=await Project.findById(id);
        if(!project) throw new Error("Project not Found..")
        if(name) project.name =name;
        if(description) project.description =description
        return await project.save()
    },
    deleteProject: async ({ id }: { id: string }) => {
     const tasks = await Task.find({ projectId: id }).select("_id").lean();
     const taskIds = tasks.map((t) => t._id);

       if (taskIds.length > 0) {
       await Timer.deleteMany({ taskId: { $in: taskIds } });
     }
     await Task.deleteMany({ projectId: id });
     await Project.findByIdAndDelete(id);
   
     return true;
}

} 