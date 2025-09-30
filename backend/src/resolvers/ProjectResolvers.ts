import {Project} from "../models/Project.js"
import {Task} from "../models/Task.js"

export const projectResolver ={
    projects:async()=>{
        return await Project.find()
    },
    project:async({id}:{id:string})=>{
        return await Project.findById(id)
    },
    createProject:async({name,description}:{name:string,description:string})=>{
        const project=new Project({name,description})
        return await project.save();
    },
    updateProject:async({id,name,description}:{id:string,name:string,description:string})=>{
        const project=await Project.findById(id);
        if(!project) throw new Error("Project not Found..")
        if(name) project.name =name;
        if(description) project.description =description
        return await project.save()
    },
    deleteProject:async({id}:{id:string})=>{
        await Project.findByIdAndDelete(id)
        await Task.deleteMany({projectId:id})
        return true
    }
} 