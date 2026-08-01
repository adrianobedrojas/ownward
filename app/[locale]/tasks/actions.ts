"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type DeleteTaskInput,
  type Task,
  type TaskActionResult,
  type TaskPriority,
  type TaskStatus,
  type ToggleTaskInput,
  type UpdateTaskInput,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

function normalizeTitle(title: string) {
  return title.trim();
}

function normalizeDescription(description?: string | null) {
  if (!description) {
    return null;
  }

  const normalized = description.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDueDate(dueDate?: string | null) {
  if (!dueDate || dueDate.trim().length === 0) {
    return { value: null as string | null };
  }

  const normalized = dueDate.trim();
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!datePattern.test(normalized)) {
    return { error: "Use the YYYY-MM-DD date format." };
  }

  const parsedDate = new Date(`${normalized}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return { error: "Please provide a valid date." };
  }

  if (parsedDate.toISOString().slice(0, 10) !== normalized) {
    return { error: "Please provide a valid calendar date." };
  }

  return { value: normalized };
}

function normalizePriority(priority?: string) {
  const normalized = (priority ?? "medium").toLowerCase();

  if (!TASK_PRIORITIES.includes(normalized as TaskPriority)) {
    return { error: "Priority must be low, medium, or high." };
  }

  return { value: normalized as TaskPriority };
}

function normalizeStatus(status?: string) {
  const normalized = (status ?? "todo").toLowerCase();

  if (!TASK_STATUSES.includes(normalized as TaskStatus)) {
    return { error: "Status must be todo or completed." };
  }

  return { value: normalized as TaskStatus };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, message: "You must be logged in to manage tasks." };
  }

  return { success: true as const, supabase, user };
}

function genericErrorResult(action: string): TaskActionResult {
  return {
    success: false,
    message: `We couldn't ${action} right now. Please try again.`,
  };
}

export async function createTask(input: CreateTaskInput): Promise<TaskActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return { success: false, message: authResult.message };
    }

    const title = normalizeTitle(input.title ?? "");
    const description = normalizeDescription(input.description);
    const dueDateResult = normalizeDueDate(input.dueDate);
    const priorityResult = normalizePriority(input.priority);

    const errors: TaskActionResult["errors"] = {};

    if (title.length === 0) {
      errors.title = "Title is required.";
    }

    if (dueDateResult.error) {
      errors.dueDate = dueDateResult.error;
    }

    if (priorityResult.error) {
      errors.priority = priorityResult.error;
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Please fix the highlighted fields.",
        errors,
      };
    }

    const { data, error } = await authResult.supabase
      .from("tasks")
      .insert({
        user_id: authResult.user.id,
        title,
        description,
        due_date: dueDateResult.value,
        priority: priorityResult.value,
      })
      .select("id, user_id, title, description, due_date, priority, status, created_at, updated_at")
      .single<Task>();

    if (error) {
      return genericErrorResult("create your task");
    }

    revalidatePath("/tasks");

    return {
      success: true,
      message: "Task created.",
      task: data,
    };
  } catch {
    return genericErrorResult("create your task");
  }
}

export async function toggleTaskCompletion(
  input: ToggleTaskInput
): Promise<TaskActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return { success: false, message: authResult.message };
    }

    if (!isUuid(input.id)) {
      return {
        success: false,
        message: "Invalid task id.",
        errors: { id: "Task id is invalid." },
      };
    }

    const nextStatus: TaskStatus = input.completed ? "completed" : "todo";

    const { data, error } = await authResult.supabase
      .from("tasks")
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", authResult.user.id)
      .select("id, user_id, title, description, due_date, priority, status, created_at, updated_at")
      .maybeSingle<Task>();

    if (error) {
      return genericErrorResult("update your task");
    }

    if (!data) {
      return {
        success: false,
        message: "Task not found.",
      };
    }

    revalidatePath("/tasks");

    return {
      success: true,
      message: nextStatus === "completed" ? "Task completed." : "Task marked as todo.",
      task: data,
    };
  } catch {
    return genericErrorResult("update your task");
  }
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return { success: false, message: authResult.message };
    }

    if (!isUuid(input.id)) {
      return {
        success: false,
        message: "Invalid task id.",
        errors: { id: "Task id is invalid." },
      };
    }

    const title = normalizeTitle(input.title ?? "");
    const description = normalizeDescription(input.description);
    const dueDateResult = normalizeDueDate(input.dueDate);
    const priorityResult = normalizePriority(input.priority);
    const statusResult = normalizeStatus(input.status);

    const errors: TaskActionResult["errors"] = {};

    if (title.length === 0) {
      errors.title = "Title is required.";
    }

    if (dueDateResult.error) {
      errors.dueDate = dueDateResult.error;
    }

    if (priorityResult.error) {
      errors.priority = priorityResult.error;
    }

    if (statusResult.error) {
      errors.status = statusResult.error;
    }

    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        message: "Please fix the highlighted fields.",
        errors,
      };
    }

    const { data, error } = await authResult.supabase
      .from("tasks")
      .update({
        title,
        description,
        due_date: dueDateResult.value,
        priority: priorityResult.value,
        status: statusResult.value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("user_id", authResult.user.id)
      .select("id, user_id, title, description, due_date, priority, status, created_at, updated_at")
      .maybeSingle<Task>();

    if (error) {
      return genericErrorResult("save your task");
    }

    if (!data) {
      return {
        success: false,
        message: "Task not found.",
      };
    }

    revalidatePath("/tasks");

    return {
      success: true,
      message: "Task updated.",
      task: data,
    };
  } catch {
    return genericErrorResult("save your task");
  }
}

export async function deleteTask(input: DeleteTaskInput): Promise<TaskActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return { success: false, message: authResult.message };
    }

    if (!isUuid(input.id)) {
      return {
        success: false,
        message: "Invalid task id.",
        errors: { id: "Task id is invalid." },
      };
    }

    const { data, error } = await authResult.supabase
      .from("tasks")
      .delete()
      .eq("id", input.id)
      .eq("user_id", authResult.user.id)
      .select("id");

    if (error) {
      return genericErrorResult("delete your task");
    }

    if (!data || data.length === 0) {
      return {
        success: false,
        message: "Task not found.",
      };
    }

    revalidatePath("/tasks");

    return {
      success: true,
      message: "Task deleted.",
    };
  } catch {
    return genericErrorResult("delete your task");
  }
}
