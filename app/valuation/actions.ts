"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ValuationEstimate, SaveEstimateInput, EstimateActionResult } from "./types";

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
    return { success: false as const, message: "You must be logged in to save estimates." };
  }

  return { success: true as const, supabase, user };
}

export async function saveEstimate(input: SaveEstimateInput): Promise<EstimateActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return { success: false, message: auth.message };

  const { supabase, user } = auth;

  const name = (input.name ?? "Untitled estimate").trim() || "Untitled estimate";

  const row = {
    user_id: user.id,
    name,
    annual_revenue: input.annualRevenue ?? null,
    base_earnings: input.baseEarnings ?? null,
    owner_compensation: input.ownerCompensation ?? 0,
    interest_addback: input.interestAddback ?? 0,
    depreciation_addback: input.depreciationAddback ?? 0,
    amortization_addback: input.amortizationAddback ?? 0,
    onetime_expenses: input.onetimeExpenses ?? 0,
    nonoperating_income: input.nonoperatingIncome ?? 0,
    normalized_earnings: input.normalizedEarnings ?? null,
    low_multiple: input.lowMultiple ?? 2,
    base_multiple: input.baseMultiple ?? 3,
    high_multiple: input.highMultiple ?? 4,
    low_estimate: input.lowEstimate ?? null,
    base_estimate: input.baseEstimate ?? null,
    high_estimate: input.highEstimate ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id && isUuid(input.id)) {
    // Update
    const { data, error } = await supabase
      .from("valuation_estimates")
      .update(row)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error || !data) {
      return { success: false, message: "We couldn't update your estimate. Please try again." };
    }

    revalidatePath("/valuation");
    return { success: true, message: "Estimate updated.", estimate: data as ValuationEstimate };
  }

  // Insert
  const { data, error } = await supabase
    .from("valuation_estimates")
    .insert(row)
    .select()
    .single();

  if (error || !data) {
    return { success: false, message: "We couldn't save your estimate. Please try again." };
  }

  revalidatePath("/valuation");
  return { success: true, message: "Estimate saved.", estimate: data as ValuationEstimate };
}

export async function deleteEstimate(id: string): Promise<EstimateActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.success) return { success: false, message: auth.message };

  const { supabase, user } = auth;

  if (!id || !isUuid(id)) {
    return { success: false, message: "Invalid estimate ID." };
  }

  const { error } = await supabase
    .from("valuation_estimates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "We couldn't delete the estimate. Please try again." };
  }

  revalidatePath("/valuation");
  return { success: true, message: "Estimate deleted." };
}
