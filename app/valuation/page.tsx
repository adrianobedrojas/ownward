import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import ValuationCalculator from "./ValuationCalculator";
import type { ValuationEstimate } from "./types";

export const metadata: Metadata = {
  title: "Valuation Scenario Builder",
  description:
    "Build a preliminary earnings-multiple estimate for your business and explore different scenarios.",
};

export default async function ValuationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let savedEstimates: ValuationEstimate[] = [];

  if (user) {
    const { data } = await supabase
      .from("valuation_estimates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    savedEstimates = (data as ValuationEstimate[] | null) ?? [];
  }

  return (
    <ValuationCalculator
      isAuthenticated={!!user}
      savedEstimates={savedEstimates}
    />
  );
}
