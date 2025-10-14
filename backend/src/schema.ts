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
    status:String
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
    password: String
    success:Boolean
    }

      type DeleteResponse {
    message: String!
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
  status:String
}
type DayWiseUserTime {
  userId: ID!
  time: Int 
  status: String! 
  tasks: [DayWiseUserTask!]!
}

type DayWiseEntry {
  date: String!          
  time: Int!             
  status: String!         
  tasks: [DayWiseUserTask!]!  
  users: [DayWiseUserTime!]!  
}


    # user day wise
  type TaskSummary {
  id: ID!
  title: String!
  time: Int!          # seconds worked on this task
  estimatedTime: Int
  savedTime: Int
  overtime: Int
  startDate: String
  endDate: String
  status:String
}
type VerifyOtpResponse {
  success: Boolean!
  message: String!
  token: String
  user: User
}
# Each project containing tasks for the user
type ProjectWithTasks {
  id: ID!
  name: String!
  description: String
  tasks: [TaskSummary!]!
}
type UserDayWise {
  projects: [ProjectWithTasks!]!
  dayWise: [DayWiseEntry!]!
}

# User type for day-wise query only
type UserDayWiseInfo {
  id: ID!
  username: String!
  email: String!
  role: String!
}
    #admin all data
    type AdminUserDayWise {
  id: ID!
  username: String!
  email: String!
  projects: [ProjectWithTasks!]!
  dayWise: [DayWiseEntry!]!
}

# Admin query response
type UserDayWiseAdminResponse {
  users: [AdminUserDayWise!]!
}

   type Screenshot {
  id: ID!
  url: String!
  createdAt: String!
}

    type Query{
    projects:[Project]
    project(id:ID!):Project
    tasks(projectId: ID!): [Task]
    task(id:ID!):Task
    users: [User!]!
    tasksForUser(userId: ID!): [Project!]!

    user(id: ID!): User

    dayWiseData(
    projectId: ID!
    userIds: [String!]!
    startDate: String!
    endDate: String!
  ): [DayWiseEntry!]!

  userDayWise(
    userId: ID!
    projectIds: [ID!]
    startDate: String!
    endDate: String!
  ): UserDayWise!

  userDayWiseAdmin(startDate: String!, endDate: String!): UserDayWiseAdminResponse!

  screenshotsByUser(userId: ID!): [Screenshot!]!
    }

    type Mutation{
     createProject(name: String!, description: String): Project
     updateProject(id: ID!, name: String, description: String): Project
     deleteProject(id: ID!): Boolean

     createUser(username: String!, email: String!, password: String!, role: String): User!
     updateUser(id: ID!, username: String, email: String, role: String): User!
     deleteUser(id: ID!): DeleteResponse!
     changePassword(id: ID!, oldPassword: String!, newPassword: String!): DeleteResponse!

     createTask(projectId: ID!, title: String!, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     updateTask(id: ID!, title: String, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     deleteTask(id: ID!): Boolean
     updateTaskStatus(taskId: ID!, status: String!): Task
 
     startTimer(taskId: ID!): Timer
     stopTimer(taskId: ID!): StopTimerResponse!

     register(username: String!, email: String!, password: String!, role: String): User
     login(email: String!, password: String!): User
     verifyOtp(email: String!, otp: String!): VerifyOtpResponse!
     resendOTP(email: String!):VerifyOtpResponse!
    }
    `
)