import {Project} from "../models/Project.js"
import {Task} from "../models/Task.js"
import { Timer } from "../models/Timer.js"

export const projectResolver ={
    projects: async () => {

  return await Project.find();
},
    adminsprojects:async(args: { userId: string })=>{
        return await Project.find({ adminId: args.userId });
    },
    project:async({id}:{id:string})=>{
        return await Project.findById(id)
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

    return await project.save();
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