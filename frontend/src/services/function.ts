import { gql } from "@apollo/client";

// GraphQL Queries & Mutations
export const GET_PROJECTS = gql`
  query {
    projects {
      id
      name
      description
      createdAt
      adminId {
        username
      }
    }
  }
`;

export const USER_TASK = gql`
  query tasksForUser($userId: ID!) {
    tasksForUser(userId: $userId) {
      id
      name
      description
      tasks {
        id
        title
        estimatedTime
        totalTime
        overtime
        savedTime
        isRunning
        startDate
        endDate
        status
        runningTimer {
          id
          startTime
          endTime
          duration
        }
        assignedUser {
          id
          username
          email
          role
        }
      }
    }
  }
`;

export const GET_TASKS = gql`
  query tasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      id
      title
      estimatedTime
      totalTime
      savedTime
      overtime
      status
      startDate
      endDate
      runningTimer {
        id
        startTime
        endTime
        duration
      }
      assignedUser {
        id
        username
        email
        role
      }
      users {
        id
        username
        email
        role
        totalTime
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation createProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
      description
      adminId {
        id
        username
      }
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation deleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($taskId: ID!, $status: String!) {
    updateTaskStatus(taskId: $taskId, status: $status) {
      id
      title
      status
      assignedUser {
        id
        username
      }
      updatedAt
    }
  }
`;

export const CREATE_TASK = gql`
  mutation createTask(
    $projectId: ID!
    $title: String!
    $estimatedTime: Int
    $assignedUserId: ID
    $startDate: String
    $endDate: String
  ) {
    createTask(
      projectId: $projectId
      title: $title
      estimatedTime: $estimatedTime
      assignedUserId: $assignedUserId
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      title
      projectId
      estimatedTime
      assignedUser {
        id
        username
      }
      startDate
      endDate
      status
    }
  }
`;

export const START_TIMER = gql`
  mutation startTimer($taskId: ID!, $userId: ID!) {
    startTimer(taskId: $taskId, userId: $userId) {
      id
      startTime
      success
      message
    }
  }
`;

export const DELETE_TASK = gql`
  mutation deleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

export const STOP_TIMER = gql`
  mutation stopTimer($taskId: ID!, $userId: ID!) {
    stopTimer(taskId: $taskId, userId: $userId) {
      totalDuration
      overtime
      savedTime
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation updateTask(
    $id: ID!
    $title: String
    $estimatedTime: Int
    $assignedUserId: ID
    $startDate: String
    $endDate: String
  ) {
    updateTask(
      id: $id
      title: $title
      estimatedTime: $estimatedTime
      assignedUserId: $assignedUserId
      startDate: $startDate
      endDate: $endDate
    ) {
      id
      title
      totalTime
      isRunning
      estimatedTime
      savedTime
      overtime
      projectId
      assignedUser {
        id
        username
      }
      startDate
      endDate
    }
  }
`;

export const REGISTRATION = gql`
  mutation register(
    $username: String!
    $email: String!
    $password: String!
    $role: String
  ) {
    register(
      username: $username
      email: $email
      password: $password
      role: $role
    ) {
      success
      message
    }
  }
`;

export const LOGIN = gql`
  mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      success
      message
    }
  }
`;

export const GET_DAY_WISE_DATA = gql`
  query GetDayWiseData(
    $projectId: ID!
    $userIds: [String!]!
    $startDate: String!
    $endDate: String!
  ) {
    dayWiseData(
      projectId: $projectId
      userIds: $userIds
      startDate: $startDate
      endDate: $endDate
    ) {
      date
      users {
        userId
        time
        status
        tasks {
          title
          time
          estimatedTime
          savedTime
          overtime
          status
        }
      }
    }
  }
`;

export const RESET = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const FORGOT = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email) {
      success
      message
    }
  }
`;

export const GET_USER_DAY_WISE = gql`
  query GetUserDayWise($userId: ID!, $startDate: String!, $endDate: String!) {
    userDayWise(userId: $userId, startDate: $startDate, endDate: $endDate) {
      projects {
        id
        name
        description
        tasks {
          id
          title
          time
          estimatedTime
          savedTime
          overtime
          startDate
          endDate
          status
        }
      }
      dayWise {
        date
        time
        status
        tasks {
          taskId
          title
          time
          estimatedTime
          savedTime
          overtime
          status
        }
      }
    }
  }
`;

export const ADMINUSER_TIMESHEET = gql`
  query GetUserDayWiseAdminUser(
    $adminId: String!
    $startDate: String!
    $endDate: String!
  ) {
    userDayWiseAdminUser(
      adminId: $adminId
      startDate: $startDate
      endDate: $endDate
    ) {
      users {
        id
        username
        email
        projects {
          id
          name
          description
          tasks {
            id
            title
            time
            estimatedTime
            savedTime
            overtime
            startDate
            endDate
            status
          }
        }
        dayWise {
          date
          time
          status
          tasks {
            taskId
            title
            time
            estimatedTime
            savedTime
            overtime
            status
          }
        }
      }
    }
  }
`;

export const ALL_TIMESHEET = gql`
  query GetUserDayWiseAdmin(
    $startDate: String!
    $endDate: String!
    $userId: ID
  ) {
    userDayWiseAdmin(
      startDate: $startDate
      endDate: $endDate
      userId: $userId
    ) {
      users {
        id
        username
        email
        projects {
          id
          name
          description
          tasks {
            id
            title
            time
            estimatedTime
            savedTime
            overtime
            startDate
            endDate
            status
          }
        }
        dayWise {
          date
          time
          status
          tasks {
            taskId
            title
            time
            estimatedTime
            savedTime
            overtime
            status
          }
        }
      }
    }
  }
`;

export const GET_ALL_USERS = gql`
  query {
    allusers {
      id
      username
      email
      role
    }
  }
`;

export const GET_USERS = gql`
  query {
    users {
      id
      username
      email
      role
    }
  }
`;

export const CREATE_USER = gql`
  mutation createUser($username: String!, $email: String!, $role: String) {
    createUser(username: $username, email: $email, role: $role) {
      success
      message
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const UPDATE_USER = gql`
  mutation updateUser($id: ID!, $username: String, $email: String, $role: String) {
    updateUser(id: $id, username: $username, email: $email, role: $role) {
      success
      message
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const DELETE_USER = gql`
  mutation deleteUser($id: ID!) {
    deleteUser(id: $id) {
      message
    }
  }
`;

export const CHANGE_PASSWORD = gql`
  mutation changePassword($id: ID!, $oldPassword: String!, $newPassword: String!) {
    changePassword(id: $id, oldPassword: $oldPassword, newPassword: $newPassword) {
      success
      message
    }
  }
`;

export const VERIFY_OTP = gql`
  mutation VerifyOtp($email: String!, $otp: String!) {
    verifyOtp(email: $email, otp: $otp) {
      success
      message
      token
      user {
        id
        username
        email
        role
      }
    }
  }
`;

export const RESEND_OTP = gql`
  mutation ResendOtp($email: String!) {
    resendOTP(email: $email) {
      success
      message
    }
  }
`;

export const SCREEN_SHOT = gql`
  query GetUserScreenshots($userId: ID!) {
    screenshotsByUser(userId: $userId) {
      id
      url
      createdAt
    }
  }
`;

export const GET_ADMIN_PROJECT = gql`
  query GetAdminsProjects($userId: ID!) {
    adminsprojects(userId: $userId) {
      id
      name
      description
      createdAt
      adminId {
        id
      }
    }
  }
`;

export const SUPERADMINCOUNT = gql`
  query {
    superAdminDashboardCount {
      totalProjects
      totalTasks
      totalUser
      teamLead
      employee
      pendingTasks
      inProgressTasks
      projectContributions {
        projectId
        projectName
        totalProjectWorkTime
        userContributions {
          userId
          username
          totalWorkTime
        }
      }
    }
  }
`;

export const TEAMLEADCOUNT = gql`
  query ($userId: ID!) {
    teamLeadDashboardCount(userId: $userId) {
      totalProjects
      totalTasks
      pendingTasks
      inProgressTasks
      totalWorkedToday
    }
  }
`;

export const EMPCOUNT = gql`
  query ($userId: ID!) {
    empDashboardCount(userId: $userId) {
      totalTasks
      pendingTasks
      inProgressTasks
      totalWorkedToday
    }
  }
`;

export const EMPDATA = gql`
  query ($userId: ID!) {
    empGet(userId: $userId) {
      id
      username
      role
      email
    }
  }
`;

export const GET_USER_RELATIONS = gql`
  query GetUserRelations($id: ID!) {
    getUserRelations(id: $id) {
      role
      employees {
        id
        username
        email
        role
      }
      teamLeads {
        id
        username
        email
        role
      }
    }
  }
`;

export const GET_TEAM_LEADS = gql`
  query GetTeamLeads($id: ID) {
    getTeamLead(id: $id) {
      id
      username
      email
      role
    }
  }
`;

export const GET_USER_TL = gql`
  query getUserTeamLead($id: ID!) {
    getUserTeamLead(id: $id) {
      id
      username
      email
      role
    }
  }
`;

export const MAILTL = gql`
  mutation SendMailToTeamLeads($userId: ID!) {
    sendMailToTeamLeads(userId: $userId) {
      success
      message
      error
    }
  }
`;

export const USER = gql`
  query GetUser($userId: ID!) {
    user(userId: $userId) {
      id
      username
      email
    }
  }
`;
