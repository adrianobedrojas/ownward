"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calculateValuation } from "@/lib/valuation/engine";
import { validateValuationInput } from "@/lib/valuation/normalization";
import { METHODOLOGY_VERSION } from "@/lib/valuation/types";
import type { ValuationInput } from "@/lib/valuation/types";
import type { SaveEstimateInput, EstimateActionResult } from "@/app/valuation/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

// ─────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────

export type ValuationActionResult =
  | { success: true; reportId: string }
  | { success: false; message: string; errors?: Record<string, string> };

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authenticated: false as const };
  }

  return { authenticated: true as const, supabase, user };
}

function parseFinancialYearsFromFormData(formData: FormData) {
  const years = [];
  for (let i = 0; i < 3; i++) {
    const fy = formData.get(`financialYears[${i}].fiscalYear`);
    if (!fy) continue;

    years.push({
      fiscalYear: parseInt(fy as string, 10),
      revenue: parseFloat((formData.get(`financialYears[${i}].revenue`) as string) ?? "0") || 0,
      cogs: parseFloat((formData.get(`financialYears[${i}].cogs`) as string) ?? "0") || 0,
      operatingExpenses: parseFloat((formData.get(`financialYears[${i}].operatingExpenses`) as string) ?? "0") || 0,
      ownerSalary: parseFloat((formData.get(`financialYears[${i}].ownerSalary`) as string) ?? "0") || 0,
      ownerBenefits: parseFloat((formData.get(`financialYears[${i}].ownerBenefits`) as string) ?? "0") || 0,
      depreciation: parseFloat((formData.get(`financialYears[${i}].depreciation`) as string) ?? "0") || 0,
      amortization: parseFloat((formData.get(`financialYears[${i}].amortization`) as string) ?? "0") || 0,
      interest: parseFloat((formData.get(`financialYears[${i}].interest`) as string) ?? "0") || 0,
      oneTimeExpenses: parseFloat((formData.get(`financialYears[${i}].oneTimeExpenses`) as string) ?? "0") || 0,
      oneTimeRevenue: parseFloat((formData.get(`financialYears[${i}].oneTimeRevenue`) as string) ?? "0") || 0,
    });
  }
  return years;
}

function parseAddBacksFromFormData(formData: FormData) {
  const addBacks = [];
  for (let i = 0; i < 10; i++) {
    const label = formData.get(`addBacks[${i}].label`);
    if (!label) continue;
    addBacks.push({
      label: (label as string).trim(),
      amount: parseFloat((formData.get(`addBacks[${i}].amount`) as string) ?? "0") || 0,
      direction: (formData.get(`addBacks[${i}].direction`) as "add" | "deduct") ?? "add",
      explanation: ((formData.get(`addBacks[${i}].explanation`) as string) ?? "").trim(),
    });
  }
  return addBacks;
}

function buildInputFromFormData(formData: FormData): ValuationInput {
  return {
    businessProfile: {
      businessName: ((formData.get("businessName") as string) ?? "").trim(),
      industry: (formData.get("industry") as never) ?? "other",
      yearEstablished: parseInt((formData.get("yearEstablished") as string) ?? "0", 10),
      currency: ((formData.get("currency") as string) ?? "USD").trim(),
    },
    financialYears: parseFinancialYearsFromFormData(formData),
    ownerEarnings: {
      ownerWeeklyHours: parseFloat((formData.get("ownerWeeklyHours") as string) ?? "0") || 0,
      replacementManagerSalary: parseFloat((formData.get("replacementManagerSalary") as string) ?? "0") || 0,
      addBacks: parseAddBacksFromFormData(formData),
    },
    revenueQuality: {
      recurringRevenuePct: parseFloat((formData.get("recurringRevenuePct") as string) ?? "0") || 0,
      largestCustomerPct: parseFloat((formData.get("largestCustomerPct") as string) ?? "0") || 0,
      top5CustomersPct: parseFloat((formData.get("top5CustomersPct") as string) ?? "0") || 0,
      contractedRevenuePct: parseFloat((formData.get("contractedRevenuePct") as string) ?? "0") || 0,
      churnRatePct:
        formData.get("churnRatePct") !== null && (formData.get("churnRatePct") as string).trim() !== ""
          ? parseFloat(formData.get("churnRatePct") as string)
          : null,
    },
    operations: {
      hasDocumentedProcedures: formData.get("hasDocumentedProcedures") === "true",
      hasKeyEmployees: formData.get("hasKeyEmployees") === "true",
      keyEmployeeCount: parseInt((formData.get("keyEmployeeCount") as string) ?? "0", 10) || 0,
      hasSystemsAndTechnology: formData.get("hasSystemsAndTechnology") === "true",
      hasProprietaryIP: formData.get("hasProprietaryIP") === "true",
    },
    assetsAndEvidence: {
      fairValueOfTangibleAssets: parseFloat((formData.get("fairValueOfTangibleAssets") as string) ?? "0") || 0,
      totalLiabilities: parseFloat((formData.get("totalLiabilities") as string) ?? "0") || 0,
      hasAuditedFinancials: formData.get("hasAuditedFinancials") === "true",
      hasTaxReturns: formData.get("hasTaxReturns") === "true",
      hasCustomerContracts: formData.get("hasCustomerContracts") === "true",
      hasEmployeeAgreements: formData.get("hasEmployeeAgreements") === "true",
    },
  };
}

// ─────────────────────────────────────────────
// Save draft
// ─────────────────────────────────────────────

export async function saveDraft(formData: FormData): Promise<ValuationActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in to save a draft." };
  }

  const { supabase, user } = auth;
  const input = buildInputFromFormData(formData);

  const reportId = (formData.get("reportId") as string) ?? null;
  const existingReportId = isUuid(reportId) ? reportId : null;

  if (existingReportId) {
    // Verify ownership before updating
    const { data: existing } = await supabase
      .from("valuation_reports")
      .select("id, user_id, status")
      .eq("id", existingReportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { success: false, message: "Report not found." };
    }

    if (existing.status === "calculated") {
      return {
        success: false,
        message: "Calculated reports cannot be modified. Start a new report to explore different inputs.",
      };
    }

    const { error } = await supabase
      .from("valuation_reports")
      .update({
        business_name: input.businessProfile.businessName,
        industry: input.businessProfile.industry,
        currency: input.businessProfile.currency,
        methodology_version: METHODOLOGY_VERSION,
        input_snapshot: input,
      })
      .eq("id", existingReportId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, message: "Failed to save draft. Please try again." };
    }

    revalidatePath("/valuation");
    return { success: true, reportId: existingReportId };
  }

  // Create new draft
  const { data, error } = await supabase
    .from("valuation_reports")
    .insert({
      user_id: user.id,
      status: "draft",
      methodology_version: METHODOLOGY_VERSION,
      currency: input.businessProfile.currency ?? "USD",
      business_name: input.businessProfile.businessName,
      industry: input.businessProfile.industry,
      input_snapshot: input,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { success: false, message: "Failed to save draft. Please try again." };
  }

  revalidatePath("/valuation");
  return { success: true, reportId: data.id };
}

// ─────────────────────────────────────────────
// Calculate report (server-side only)
// ─────────────────────────────────────────────

export async function calculateReport(formData: FormData): Promise<ValuationActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in to generate a report." };
  }

  const { supabase, user } = auth;
  const input = buildInputFromFormData(formData);

  // Validate input on the server
  const validationErrors = validateValuationInput(input);
  if (validationErrors.length > 0) {
    const errors: Record<string, string> = {};
    for (const err of validationErrors) {
      errors[err.field] = err.message;
    }
    return {
      success: false,
      message: "Please fix the highlighted fields.",
      errors,
    };
  }

  // Run the calculation entirely on the server
  const result = calculateValuation(input);

  const reportId = (formData.get("reportId") as string) ?? null;
  const existingReportId = isUuid(reportId) ? reportId : null;

  if (existingReportId) {
    // Verify ownership
    const { data: existing } = await supabase
      .from("valuation_reports")
      .select("id, user_id, status")
      .eq("id", existingReportId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { success: false, message: "Report not found." };
    }

    if (existing.status === "calculated") {
      // Create a new version rather than overwriting
      const { data: newReport, error: newError } = await supabase
        .from("valuation_reports")
        .insert({
          user_id: user.id,
          status: "calculated",
          methodology_version: METHODOLOGY_VERSION,
          currency: input.businessProfile.currency,
          business_name: input.businessProfile.businessName,
          industry: input.businessProfile.industry,
          defensive_value: result.defensiveValue,
          expected_value: result.expectedValue,
          strategic_value: result.strategicValue,
          confidence_score: result.confidenceScore,
          input_snapshot: input,
          result_snapshot: result,
          version: 1,
        })
        .select("id")
        .single();

      if (newError || !newReport) {
        return { success: false, message: "Failed to save report. Please try again." };
      }

      revalidatePath("/valuation");
      return { success: true, reportId: newReport.id };
    }

    // Update existing draft to calculated
    const { error: updateError } = await supabase
      .from("valuation_reports")
      .update({
        status: "calculated",
        methodology_version: METHODOLOGY_VERSION,
        currency: input.businessProfile.currency,
        business_name: input.businessProfile.businessName,
        industry: input.businessProfile.industry,
        defensive_value: result.defensiveValue,
        expected_value: result.expectedValue,
        strategic_value: result.strategicValue,
        confidence_score: result.confidenceScore,
        input_snapshot: input,
        result_snapshot: result,
      })
      .eq("id", existingReportId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, message: "Failed to save report. Please try again." };
    }

    revalidatePath("/valuation");
    return { success: true, reportId: existingReportId };
  }

  // Create new calculated report
  const { data: newReport, error: insertError } = await supabase
    .from("valuation_reports")
    .insert({
      user_id: user.id,
      status: "calculated",
      methodology_version: METHODOLOGY_VERSION,
      currency: input.businessProfile.currency,
      business_name: input.businessProfile.businessName,
      industry: input.businessProfile.industry,
      defensive_value: result.defensiveValue,
      expected_value: result.expectedValue,
      strategic_value: result.strategicValue,
      confidence_score: result.confidenceScore,
      input_snapshot: input,
      result_snapshot: result,
    })
    .select("id")
    .single();

  if (insertError || !newReport) {
    return { success: false, message: "Failed to save report. Please try again." };
  }

  revalidatePath("/valuation");
  redirect(`/valuation/${newReport.id}`);
}

// ─────────────────────────────────────────────
// Archive report
// ─────────────────────────────────────────────

export async function archiveReport(formData: FormData): Promise<ValuationActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in." };
  }

  const { supabase, user } = auth;
  const reportId = formData.get("reportId") as string;

  if (!isUuid(reportId)) {
    return { success: false, message: "Invalid report ID." };
  }

  const { error } = await supabase
    .from("valuation_reports")
    .update({ status: "archived" })
    .eq("id", reportId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to archive report." };
  }

  revalidatePath("/valuation");
  return { success: true, reportId };
}

/**
 * Form action wrapper — archives the report and redirects to /valuation.
 * Use this as the `action` prop on a <form> element.
 */
export async function archiveReportFormAction(formData: FormData): Promise<void> {
  await archiveReport(formData);
  redirect("/valuation");
}

// ─────────────────────────────────────────────
// Save estimate
// ─────────────────────────────────────────────

export async function saveEstimate(input: SaveEstimateInput): Promise<EstimateActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in to save estimates." };
  }

  const { supabase, user } = auth;

  const payload = {
    user_id: user.id,
    name: (input.name ?? "Untitled estimate").trim().slice(0, 200) || "Untitled estimate",
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
  };

  // Update existing estimate
  if (input.id && isUuid(input.id)) {
    const { data, error } = await supabase
      .from("valuation_estimates")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error || !data) {
      return { success: false, message: "Failed to update estimate." };
    }

    revalidatePath("/valuation");
    return { success: true, message: "Estimate updated.", estimate: data };
  }

  // Insert new estimate
  const { data, error } = await supabase
    .from("valuation_estimates")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error || !data) {
    return { success: false, message: "Failed to save estimate." };
  }

  revalidatePath("/valuation");
  return { success: true, message: "Estimate saved.", estimate: data };
}

// ─────────────────────────────────────────────
// Delete estimate
// ─────────────────────────────────────────────

export async function deleteEstimate(id: string): Promise<EstimateActionResult> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, message: "You must be signed in." };
  }

  if (!isUuid(id)) {
    return { success: false, message: "Invalid estimate ID." };
  }

  const { supabase, user } = auth;

  const { error } = await supabase
    .from("valuation_estimates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: "Failed to delete estimate." };
  }

  revalidatePath("/valuation");
  return { success: true, message: "Estimate deleted." };
}
