"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Task, TaskPriorityActionResult } from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TASK_SELECT_COLUMNS =
  "id, user_id, title, description, due_date, priority, status, pairwise_rating, pairwise_comparison_count, pairwise_win_count, created_at, updated_at";

function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false as const };
  }

  return { success: true as const, supabase, user };
}

async function loadTaskPriorityRankingInternal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT_COLUMNS)
    .eq("user_id", userId)
    .eq("status", "todo")
    .order("pairwise_rating", { ascending: false })
    .order("pairwise_comparison_count", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  return (data as Task[] | null) ?? [];
}

export async function loadTaskPriorityRanking(): Promise<TaskPriorityActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return {
        success: false,
        code: "notAuthenticated",
      };
    }

    const tasks = await loadTaskPriorityRankingInternal(authResult.supabase, authResult.user.id);

    if (!tasks) {
      console.error("Failed to load task pairwise ranking.");
      return {
        success: false,
        code: "genericError",
      };
    }

    return {
      success: true,
      code: "rankingLoaded",
      tasks,
    };
  } catch (error) {
    console.error("Unexpected error loading task pairwise ranking.", error);
    return {
      success: false,
      code: "genericError",
    };
  }
}

export async function recordTaskPairwiseChoice(input: {
  winnerTaskId: string;
  loserTaskId: string;
}): Promise<TaskPriorityActionResult> {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult.success) {
      return {
        success: false,
        code: "notAuthenticated",
      };
    }

    if (
      !isUuid(input.winnerTaskId) ||
      !isUuid(input.loserTaskId) ||
      input.winnerTaskId === input.loserTaskId
    ) {
      return {
        success: false,
        code: "invalidTaskIds",
      };
    }

    const { error } = await authResult.supabase.rpc("record_task_pairwise_choice", {
      winner_task_id: input.winnerTaskId,
      loser_task_id: input.loserTaskId,
    });

    if (error) {
      console.error("Failed to record task pairwise choice.", error);
      return {
        success: false,
        code: "genericError",
      };
    }

    const { data: updatedTasks, error: updatedTasksError } = await authResult.supabase
      .from("tasks")
      .select(TASK_SELECT_COLUMNS)
      .eq("user_id", authResult.user.id)
      .in("id", [input.winnerTaskId, input.loserTaskId]);

    if (updatedTasksError) {
      console.error("Failed to load updated task pairwise ratings.", updatedTasksError);
      return {
        success: false,
        code: "genericError",
      };
    }

    revalidatePath("/tasks");

    return {
      success: true,
      code: "choiceSaved",
      tasks: (updatedTasks as Task[] | null) ?? [],
    };
  } catch (error) {
    console.error("Unexpected error recording task pairwise choice.", error);
    return {
      success: false,
      code: "genericError",
    };
  }
}
