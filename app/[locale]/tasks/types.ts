export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export const TASK_STATUSES = ["todo", "completed"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  pairwise_rating: number;
  pairwise_comparison_count: number;
  pairwise_win_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string;
}

export interface UpdateTaskInput {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: string;
  status?: string;
}

export interface DeleteTaskInput {
  id: string;
}

export interface ToggleTaskInput {
  id: string;
  completed: boolean;
}

export interface TaskActionResult {
  success: boolean;
  message: string;
  task?: Task;
  errors?: {
    title?: string;
    dueDate?: string;
    priority?: string;
    status?: string;
    id?: string;
  };
}

export type TaskPriorityActionCode =
  | "choiceSaved"
  | "genericError"
  | "invalidTaskIds"
  | "notAuthenticated"
  | "rankingLoaded";

export interface TaskPriorityActionResult {
  success: boolean;
  code: TaskPriorityActionCode;
  tasks?: Task[];
}
