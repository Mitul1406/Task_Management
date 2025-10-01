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
// GraphQL Queries & Mutations
const GET_PROJECTS = gql`
  query {
    projects {
      id
      name
      description
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

const CREATE_TASK = gql`
  mutation createTask($projectId: ID!, $title: String!, $estimatedTime: Int, $assignedUserId: ID) {
    createTask(projectId: $projectId, title: $title, estimatedTime: $estimatedTime, assignedUserId: $assignedUserId) {
      id
      title
      projectId
      estimatedTime
      assignedUser { id username }
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
  mutation updateTask($id: ID!, $title: String, $estimatedTime: Int, $assignedUserId: ID) {
    updateTask(id: $id, title: $title, estimatedTime: $estimatedTime, assignedUserId: $assignedUserId) {
      id
      title
      totalTime
      isRunning
      estimatedTime
      savedTime
      overtime
      projectId
      assignedUser { id username }
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
  return (res as any).data.createTask; // returns task document
};

export const startTimer = async (taskId: string) => {
  const res = await client.mutate({ mutation: START_TIMER, variables: { taskId } });
  return (res as any).data.startTimer; // returns timer document
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
  assignedUserId?: string
) => {
  const res = await client.mutate({
    mutation: CREATE_TASK,
    variables: { projectId, title, estimatedTime, assignedUserId },
  });
  return (res as any).data.createTask;
};

export const updateTaskAdmin = async (
  id: string,
  title?: string,
  estimatedTime?: number,
  assignedUserId?: string
) => {
  const res = await client.mutate({
    mutation: UPDATE_TASK,
    variables: { id, title, estimatedTime, assignedUserId },
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

