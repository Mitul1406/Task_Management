import { buildSchema } from "graphql";
// import { Schema } from "mongoose";

export const schema=buildSchema(`
    type Project{
        id:ID!,
        name:String!,
        description:String,
        tasks:[Task]
    }
    type Task {
  id: ID!
  projectId: ID!
  title: String!
  timers: [Timer]
  createdAt: String
  updatedAt: String

  totalTime: Int        # total duration in seconds
  isRunning: Boolean    # whether a timer is running
  runningTimer: Timer   # currently running timer
  estimatedTime: Int
}
   

    type Timer{
    id: ID!
    taskId: ID!
    startTime: String!
    endTime: String
    duration: Int
    }

    type Query{
    projects:[Project]
    project(id:ID!):Project
    tasks(projectId: ID!): [Task]
    task(id:ID!):Task
    }

    type Mutation{
     createProject(name: String!, description: String): Project
     updateProject(id: ID!, name: String, description: String): Project
     deleteProject(id: ID!): Boolean

     createTask(projectId: ID!, title: String!,estimatedTime: Int): Task
     updateTask(id: ID!, title: String,estimatedTime: Int): Task
     deleteTask(id: ID!): Boolean
 
     startTimer(taskId: ID!): Timer
     stopTimer(taskId: ID!): Timer
    }
    `
)