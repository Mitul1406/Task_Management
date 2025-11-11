import { buildSchema } from "graphql";
// import { Schema } from "mongoose";

export const schema=buildSchema(`
  type UserContribution {
  userId: ID!
  username: String
  totalWorkTime: Float  # in hours or minutes — your choice
}

type ProjectContribution {
  projectId: ID!
  projectName: String
  totalProjectWorkTime: Float
  userContributions: [UserContribution]
}
  type DashboardCountTl{
  totalProjects: Int,
      totalTasks: Int,
      pendingTasks: Int,
      inProgressTasks: Int,
      totalWorkedToday: Int,
  }
  type DashboardCount {
    totalProjects: Int
    totalTasks: Int
    totalUser: Int
    teamLead: Int
    employee: Int
    pendingTasks: Int
    inProgressTasks: Int
    projectContributions: [ProjectContribution]
  }
    type Project{
        id:ID!,
        name:String!,
        description:String,
        createdAt:String,
        tasks:[Task]
        adminId:User
    }
        type UserTime {
  id: ID!
  username: String!
  email: String
  role: String
  totalTime: Int!
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
    users: [UserTime]
  }
   

    type Timer{
    id: ID
    taskId: ID
    userId: ID
    startTime: String
    endTime: String
    duration: Int
    success: Boolean
    message: String
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
    type ChangePasswordResponse {
  success: Boolean!
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

type AuthResponse {
  success: Boolean!
  message: String!
}
 type CreateUserResponse {
  success: Boolean!
  message: String!
  user: User
}

  type Query{
    projects:[Project]
    adminsprojects(userId: ID!): [Project]
    project(id:ID!):Project
    tasks(projectId: ID!): [Task]
    task(id:ID!):Task
    users: [User!]!
    tasksForUser(userId: ID!): [Project!]!

    allusers: [User!]!

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

  userDayWiseAdmin(startDate: String!, endDate: String!,userId:ID): UserDayWiseAdminResponse!
  userDayWiseAdminUser(adminId:String!,startDate: String!, endDate: String!): UserDayWiseAdminResponse!
  screenshotsByUser(userId: ID!): [Screenshot!]!

  superAdminDashboardCount: DashboardCount
  teamLeadDashboardCount(userId: ID!): DashboardCountTl
  empDashboardCount(userId: ID!): DashboardCountTl
    }

    type Mutation{
     createProject(name: String!, description: String): Project
     updateProject(id: ID!, name: String, description: String): Project
     deleteProject(id: ID!): Boolean

     createUser(username: String!, email: String!, role: String): CreateUserResponse!
     updateUser(id: ID!, username: String, email: String, role: String): CreateUserResponse!
     deleteUser(id: ID!): DeleteResponse!
     changePassword(id: ID!, oldPassword: String!, newPassword: String!): ChangePasswordResponse!

     createTask(projectId: ID!, title: String!, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     updateTask(id: ID!, title: String, estimatedTime: Int, assignedUserId: ID,startDate: String,endDate: String): Task
     deleteTask(id: ID!): Boolean
     updateTaskStatus(taskId: ID!, status: String!): Task

     startTimer(taskId: ID!, userId: ID!): Timer!
     stopTimer(taskId: ID!, userId: ID!): StopTimerResponse!

     register(username: String!, email: String!, password: String!, role: String): User
     login(email: String!, password: String!): User
     verifyOtp(email: String!, otp: String!): VerifyOtpResponse!
     resendOTP(email: String!):VerifyOtpResponse!
     forgotPassword(email: String!): AuthResponse!
     resetPassword(token: String!, newPassword: String!): AuthResponse!
    }
    `
)