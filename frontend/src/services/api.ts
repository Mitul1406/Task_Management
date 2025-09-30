import client from "../lib/apolloClient";
import { gql } from "@apollo/client";

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

const GET_TASKS = gql`
  query tasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      id
      title
      createdAt
      updatedAt
      totalTime        
      isRunning
      runningTimer {   
        id
        startTime
        endTime
        duration
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
  mutation createTask($projectId: ID!, $title: String!) {
    createTask(projectId: $projectId, title: $title) {
      id
      title
      projectId
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
      id
      duration
      startTime
      endTime
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

export const loginUser = async (email:string,password:string)=>{

  
}