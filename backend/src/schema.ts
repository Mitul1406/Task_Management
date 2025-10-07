import { buildSchema } from "graphql";
// import { Schema } from "mongoose";

export const schema=buildSchema(`
    type Project{
        id:ID!,
        name:String!,
        description:String,
        createdAt:String,
        tasks:[Task]
    }
    type Task {
    id: ID!
    projectId: ID!
    title: String!
    estimatedTime: Int
    totalTime: Int
    isRunning: Boolean
    runningTimer: Timer
    assignedUserId: ID
    assignedUser: User
    createdAt: String
    updatedAt: String
    overtime:Int
    savedTime:Int
    startDate:String
    endDate: String
  }
   

    type Timer{
    id: ID!
    taskId: ID!
    startTime: String!
    endTime: String
    duration: Int
    }
    
    type User {
    id: ID!
    username: String!
    email: String!
    role: String!
    token: String
    message: String
    }
    type StopTimerResponse {
  totalDuration: Int!
  overtime: Int!
  savedTime: Int!
}
  type DayWiseUserTask {
  taskId: ID!
  title: String!
  time: Int!  # seconds worked on this task that day
  estimatedTime: Int # estimated time for this task
  savedTime: Int     # saved time for this task
  overtime: Int
}
type DayWiseUserTime {
  userId: ID!
  time: Int 
  status: String! 
  tasks: [DayWiseUserTask!]!
}

type DayWiseEntry {
  date: String!  # YYYY-MM-DD
  users: [DayWiseUserTime!]!
}

    type Query{
    projects:[Project]
    project(id:ID!):Project
    tasks(projectId: ID!): [Task]
    task(id:ID!):Task
    users: [User!]!
    tasksForUser(userId: ID!): [Project!]!
    dayWiseData(
    projectId: ID!
    userIds: [String!]!
    startDate: String!
    endDate: String!
  ): [DayWiseEntry!]!
    }

    type Mutation{
     createProject(name: String!, description: String): Project
     updateProject(id: ID!, name: String, description: String): Project
     deleteProject(id: ID!): Boolean

     createTask(projectId: ID!, title: String!, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     updateTask(id: ID!, title: String, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     deleteTask(id: ID!): Boolean
 
     startTimer(taskId: ID!): Timer
     stopTimer(taskId: ID!): StopTimerResponse!

     register(username: String!, email: String!, password: String!, role: String): User
     login(email: String!, password: String!): User
    }
    `
)