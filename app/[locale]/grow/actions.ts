"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  type CreateGoalInput,
  type GoalActionResult,
  type GoalCategory,
  type GoalStatus,
  type GrowthGoal,
  type UpdateGoalInput,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const, message: "You must be logged in to manage goals." };
  }

  return { success: true as const, supabase, user };
}

function normalizeTitle(title: string) {
  return title.trim();
}

function normalizeDecimal(raw?: string | null): { value: number | null } | { error: string } {
  if (!raw || raw.trim() === "") return { value: null };
  const parsed = parseFloat(raw.trim().replace(/,/g, ""));
  if (Number.isNaN(parsed)) return { error: "Must be a valid number." };
  return { value: parsed };
}

function normalizeDate(raw?: string | null): { value: string | null } | { error: string } {
  if (!raw || raw.trim() === "") return { value: null };
  const normalized = raw.trim();
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(normalized)) return { error: "Use the YYYY-MM-DD date format." };
  const d = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { error: "Please provide a valid date." };
  if (d.toISOString().slice(0, 10) !== normalized) return { error: "Please provide a valid calendar date." };
  return { value: normalized };
}

function normalizeCategory(raw?: string): { value: GoalCategory } | { error: string } {
  const normalized = (raw ?? "other").toLowerCase();
  if (!GOAL_CATEGORIES.includes(normalized as GoalCategory)) {
    return { error: "Please select a valid category." };
  }
  return { value: normalized as GoalCategory };
}

function normalizeStatus(raw?: string): { value: GoalStatus } | { error: string } {
  const normalized = (raw ?? "active").toLowerCase();
  if (!GOAL_STATUSES.includes(normalized as GoalStatus)) {
    return { error: "Status must be active, completed, paused, or cancelled." };
  }
  return { value: normalized as GoalStatus };
}

export async function createGoal(input: CreateGoalInput): Promise<GoalActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return { success: false, message: auth.message };

  const { supabase, user } = auth;

  const title = normalizeTitle(input.title ?? "");
  if (!title) return { success: false, message: "Title is required.", errors: { title: "Title is required." } };
  if (title.length > 200) return { success: false, message: "Title is too long.", errors: { title: "Maximum 200 characters." } };

  const categoryResult = normalizeCategory(input.category);
  if ("error" in categoryResult) return { success: false, message: categoryResult.error, errors: { category: categoryResult.error } };

  const startResult = normalizeDecimal(input.startValue);
  if ("error" in startResult) return { success: false, message: startResult.error, errors: { startValue: startResult.error } };

  const currentResult = normalizeDecimal(input.currentValue);
  if ("error" in currentResult) return { success: false, message: currentResult.error, errors: { currentValue: currentResult.error } };

  const targetResult = normalizeDecimal(input.targetValue);
  if ("error" in targetResult) return { success: false, message: targetResult.error, errors: { targetValue: targetResult.error } };

  const deadlineResult = normalizeDate(input.deadline);
  if ("error" in deadlineResult) return { success: false, message: deadlineResult.error, errors: { deadline: deadlineResult.error } };

  const { data, error } = await supabase
    .from("growth_goals")
    .insert({
      user_id: user.id,
      title,
      category: categoryResult.value,
      metric_name: input.metricName?.trim() || null,
      metric_unit: input.metricUnit?.trim() || null,
      start_value: startResult.value,
      current_value: currentResult.value,
      target_value: targetResult.value,
      deadline: deadlineResult.value,
      notes: input.notes?.trim() || null,
      status: "active",
    })
    .select()
    .single();

  if (error || !data) {
    return { success: false, message: "We couldn't create your goal. Please try again." };
  }

  revalidatePath("/grow");
  return { success: true, message: "Goal created.", goal: data as GrowthGoal };
}

export async function updateGoal(input: UpdateGoalInput): Promise<GoalActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return { success: false, message: auth.message };

  const { supabase, user } = auth;

  if (!input.id || !isUuid(input.id)) {
    return { success: false, message: "Invalid goal ID.", errors: { id: "Invalid goal ID." } };
  }

  const title = normalizeTitle(input.title ?? "");
  if (!title) return { success: false, message: "Title is required.", errors: { title: "Title is required." } };
  if (title.length > 200) return { success: false, message: "Title is too long.", errors: { title: "Maximum 200 characters." } };

  const categoryResult = normalizeCategory(input.category);
  if ("error" in categoryResult) return { success: false, message: categoryResult.error, errors: { category: categoryResult.error } };

  const statusResult = normalizeStatus(input.status);
  if ("error" in statusResult) return { success: false, message: statusResult.error, errors: { status: statusResult.error } };

  const startResult = normalizeDecimal(input.startValue);
  if ("error" in startResult) return { success: false, message: startResult.error, errors: { startValue: startResult.error } };

  const currentResult = normalizeDecimal(input.currentValue);
  if ("error" in currentResult) return { success: false, message: currentResult.error, errors: { currentValue: currentResult.error } };

  const targetResult = normalizeDecimal(input.targetValue);
  if ("error" in targetResult) return { success: false, message: targetResult.error, errors: { targetValue: targetResult.error } };

  const deadlineResult = normalizeDate(input.deadline);
  if ("error" in deadlineResult) return { success: false, message: deadlineResult.error, errors: { deadline: deadlineResult.error } };

  const { data, error } = await supabase
    .from("growth_goals")
    .update({
      title,
      category: categoryResult.value,
      status: statusResult.value,
      metric_name: input.metricName?.trim() || null,
      metric_unit: input.metricUnit?.trim() || null,
      start_value: startResult.value,
      current_value: currentResult.value,
      target_value: targetResult.value,
      deadline: deadlineResult.value,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    return { success: false, message: "We couldn't update your goal. Please try again." };
  }

  revalidatePath("/grow");
  return { success: true, message: "Goal updated.", goal: data as GrowthGoal };
}

export async function deleteGoal(id: string): Promise<GoalActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return { success: false, message: auth.message };

  const { supabase, user } = auth;

  if (!id || !isUuid(id)) {
    return { success: false, message: "Invalid goal ID." };
  }

  const { error } = await supabase
    .from("growth_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "We couldn't delete your goal. Please try again." };
  }

  revalidatePath("/grow");
  return { success: true, message: "Goal deleted." };
}
