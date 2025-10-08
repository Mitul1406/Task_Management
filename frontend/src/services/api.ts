import client from "../lib/apolloClient";
import { gql } from "@apollo/client";
import {jwtDecode} from "jwt-decode";

interface JwtPayload {
  id: string;
  role: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}
export interface TaskReport {
  id: string;
  title: string;
  duration: number;      
  estimatedTime: number;
  overtime: number;
  savedTime: number;
}
export interface DailyTaskReport {
  date: string;
  used: number;      
  est: number;       
  overtime: number;  
  saved: number;     
  tasks: TaskReport[];
}

interface Task {
  id: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
  startDate?: string;
  endDate?: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

interface DayWiseTask {
  taskId: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
}

interface DayWise {
  date: string;
  time: number;
  status: string;
  tasks: DayWiseTask[];
}

interface UserDayWiseResponse {
  projects: Project[];
  dayWise: DayWise[];
}
// GraphQL Queries & Mutations
const GET_PROJECTS = gql`
  query {
    projects {
      id
      name
      description
      createdAt
    }
  }
`;
const USER_TASK=gql`query tasksForUser($userId: ID!) {
  tasksForUser(userId: $userId) {
    id
    name
    description
    tasks {
      id
      title
      estimatedTime
      totalTime
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
`
const GET_TASKS = gql`
  query tasks($projectId: ID!) {
    tasks(projectId: $projectId) {
    id
    title
    createdAt
    updatedAt
    totalTime
    isRunning
    estimatedTime
    overtime
    savedTime
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
`;

const CREATE_PROJECT = gql`
  mutation createProject($name: String!, $description: String) {
    createProject(name: $name, description: $description) {
      id
      name
      description
    }
  }
`;

const DELETE_PROJECT = gql`
  mutation deleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;
const UPDATE_TASK_STATUS=gql`
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
`
const CREATE_TASK = gql`
  mutation createTask($projectId: ID!, $title: String!, $estimatedTime: Int, $assignedUserId: ID,$startDate: String,$endDate:String) {
    createTask(projectId: $projectId, title: $title, estimatedTime: $estimatedTime, assignedUserId: $assignedUserId,startDate:$startDate,endDate:$endDate) {
      id
      title
      projectId
      estimatedTime
      assignedUser { id username }
      startDate
      endDate
      status
    }
  }
`;


const START_TIMER = gql`
  mutation startTimer($taskId: ID!) {
    startTimer(taskId: $taskId) {
      id
      startTime
    }
  }
`;

const DELETE_TASK = gql`
  mutation deleteTask($id: ID!) {
    deleteTask(id: $id)
  }
`;

const STOP_TIMER = gql`
  mutation stopTimer($taskId: ID!) {
    stopTimer(taskId: $taskId) {
    totalDuration
    overtime
    savedTime
    }
  }
`;
const UPDATE_TASK = gql`
  mutation updateTask($id: ID!, $title: String, $estimatedTime: Int, $assignedUserId: ID,$startDate: String,
    $endDate: String) {
    updateTask(id: $id, title: $title, estimatedTime: $estimatedTime, assignedUserId: $assignedUserId,startDate: $startDate,
      endDate: $endDate) {
      id
      title
      totalTime
      isRunning
      estimatedTime
      savedTime
      overtime
      projectId
      assignedUser { id username }
      startDate
      endDate
    }
  }
`;
 
const REGISTRATION =gql`
mutation register($username: String!, $email: String!, $password: String!, $role: String) {
    register(username: $username, email: $email, password: $password, role: $role) {
      id
      username
      email
      role
      token
      message
    }
  }
`;
const LOGIN =gql`
mutation login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      id
      username
      email
      role
      token
      message
    }
  }
`;
const GET_DAY_WISE_DATA = gql`
  query GetDayWiseData($projectId: ID!, $userIds: [String!]!, $startDate: String!, $endDate: String!) {
    dayWiseData(projectId: $projectId, userIds: $userIds, startDate: $startDate, endDate: $endDate) {
      date
      users {
        userId
        time
        status
        
        tasks
      {
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

const GET_USER_DAY_WISE = gql`
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
// API Functions
export const getProjects = async () => {
  const res = await client.query({ query: GET_PROJECTS,fetchPolicy: "network-only", });
  return (res as any).data.projects;
};

export const getTasksByProject = async (projectId: string) => {
  const res = await client.query({
    query: GET_TASKS,
    variables: { projectId },
    fetchPolicy: "network-only",
  });
  return (res as any).data.tasks;
};


export const createProject = async (name: string, description?: string) => {
  const res = await client.mutate({
    mutation: CREATE_PROJECT,
    variables: { name, description },
  });
  return (res as any).data.createProject; // returns project document
};

export const deleteProject = async (id: string) => {
  const res = await client.mutate({
    mutation: DELETE_PROJECT,
    variables: { id },
  });
  return (res as any).data.deleteProject; // returns true
};

export const createTask = async (projectId: string, title: string) => {
  const res = await client.mutate({
    mutation: CREATE_TASK,
    variables: { projectId, title },
  });
  return (res as any).data.createTask; 
};

export const startTimer = async (taskId: string) => {
  const res = await client.mutate({ mutation: START_TIMER, variables: { taskId } });
  return (res as any).data.startTimer;
};

export const stopTimer = async (taskId: string) => {
  const res = await client.mutate({ mutation: STOP_TIMER, variables: { taskId } });
  return (res as any).data.stopTimer; // returns timer document
};

export const deleteTask = async (id: string) => {
  const res = await client.mutate({
    mutation: DELETE_TASK,
    variables: { id },
  });
  return (res as any).data.deleteTask; 
};

export const createTaskAdmin = async (
  projectId: string,
  title: string,
  estimatedTime?: number,
  assignedUserId?: string,
  startDate?: string,
  endDate?: string
) => {
  const res = await client.mutate({
    mutation: CREATE_TASK,
    variables: { projectId, title, estimatedTime, assignedUserId,startDate,
      endDate },
  });
  return (res as any).data.createTask;
};

export const updateTaskAdmin = async (
  id: string,
  title?: string,
  estimatedTime?: number,
  assignedUserId?: string,
  startDate?: string,
  endDate?: string
) => {
  const res = await client.mutate({
    mutation: UPDATE_TASK,
    variables: { id, title, estimatedTime, assignedUserId,startDate,endDate },
  });
  return (res as any).data.updateTask;
};

  
 export const login=async (email?:string,password?:string)=>{
     const res =await client.mutate({
      mutation:LOGIN,
      variables:{email,password},
     })    
     return (res as any).data.login
 }

  export const register=async (email?:string,password?:string,username?:string)=>{
     const res =await client.mutate({
      mutation:REGISTRATION,
      variables:{email,password,username},
     })

     return (res as any).data.register
 }

 export const getUsers = async () => {
  const res = await client.query({ query: gql`query { users { id username email role } }` });
  return (res as any).data.users;
};

export const getUserTasks = async () => {
  const token = localStorage.getItem("token");
  if (!token) return [];

  const parsed = jwtDecode<JwtPayload>(token)
  const userId = parsed.id; 

  const res = await client.query({
    query: USER_TASK,
    variables: { userId },
    fetchPolicy: "no-cache", 
  });

  return (res as any).data.tasksForUser;
};

export const getDayWiseData = async ({
  projectId,
  userIds,
  startDate,
  endDate,
}: {
  projectId: string;
  userIds: string[];
  startDate: string;
  endDate: string;
}) => {
  const res = await client.query({
    query: GET_DAY_WISE_DATA,
    variables: { projectId, userIds, startDate, endDate },
    fetchPolicy: "network-only",
  });

  return (res as any).data.dayWiseData;
};

export const getUserDayWise = async (
  userId: string,
  startDate: string,
  endDate: string
): Promise<UserDayWiseResponse | null> => {
  try {
    const { data } = await client.query({
      query: GET_USER_DAY_WISE,
      variables: { userId, startDate, endDate },
      fetchPolicy: 'no-cache',
    });

    return (data as any).userDayWise;
  } catch (error) {
    console.error('Error fetching user day-wise data:', error);
    return null;
  }
};

export const updateTaskStatus = async (taskId: string, status: string) => {
  const res = await client.mutate({
    mutation: UPDATE_TASK_STATUS,
    variables: { taskId, status },
  });
  return (res as any).data.updateTaskStatus;
};