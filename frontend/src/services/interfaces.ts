export interface JwtPayload {
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

export interface Task {
  id: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
  startDate?: string;
  endDate?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

export interface DayWiseTask {
  taskId: string;
  title: string;
  time: number;
  estimatedTime: number;
  savedTime: number;
  overtime: number;
}

export interface DayWise {
  date: string;
  time: number;
  status: string;
  tasks: DayWiseTask[];
}

export interface UserDayWiseResponse {
  projects: Project[];
  dayWise: DayWise[];
}
