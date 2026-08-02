import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import TaskManager from "@/components/TaskManager";
import { requireUser } from "@/lib/require-user";
import type { Task } from "./types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    title: t("tasks.title"),
    description: t("tasks.description"),
  };
}

function sortTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    const aCompleted = a.status === "completed" ? 1 : 0;
    const bCompleted = b.status === "completed" ? 1 : 0;

    if (aCompleted !== bCompleted) {
      return aCompleted - bCompleted;
    }

    if (!a.due_date && b.due_date) {
      return 1;
    }

    if (a.due_date && !b.due_date) {
      return -1;
    }

    if (a.due_date && b.due_date && a.due_date !== b.due_date) {
      return a.due_date.localeCompare(b.due_date);
    }

    return b.created_at.localeCompare(a.created_at);
  });
}

export default async function TasksPage() {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id, user_id, title, description, due_date, priority, status, pairwise_rating, pairwise_comparison_count, pairwise_win_count, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const tasks = sortTasks((data as Task[] | null) ?? []);

  return (
    <TaskManager
      initialTasks={tasks}
      initialError={error ? "We couldn't load your tasks right now." : undefined}
    />
  );
}
