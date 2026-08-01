import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GoalManager from "./GoalManager";
import type { GrowthGoal } from "./types";

export const metadata: Metadata = {
  title: "90-Day Growth Planner",
  description:
    "Set measurable growth goals, track progress, and focus on what moves your business forward.",
};

export default async function GrowPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("growth_goals")
    .select(
      "id, user_id, business_id, title, category, metric_name, metric_unit, start_value, current_value, target_value, deadline, status, notes, created_at, updated_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <GoalManager
      initialGoals={(data as GrowthGoal[] | null) ?? []}
      initialError={error ? "We couldn't load your goals right now." : undefined}
    />
  );
}
