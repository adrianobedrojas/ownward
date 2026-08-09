/**
 * build-exit-intelligence.ts
 *
 * Assembles ExitIntelligenceData from raw Supabase records.
 * Reuses existing sale-readiness engine utilities; never duplicates scoring.
 *
 * DISCLAIMER: Planning and educational intelligence only. Not legal, tax,
 * accounting, brokerage, investment, or certified valuation advice.
 */

import {
  buildActionPlan,
  estimateTimelineMonths,
  CATEGORY_LABELS,
} from "@/lib/sale-readiness/engine";
import type { CategoryResult, SaleReadinessResult } from "@/lib/sale-readiness/engine";
import type {
  ExitIntelligenceData,
  ExitRisk,
  BuyerLensEntry,
  ValueDriver,
  SaleReadinessSnapshot,
  ValuationPosition,
} from "./types";

// ─── Safe JSON helpers ────────────────────────────────────────────────────────

function safeArray<T>(value: unknown): T[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function safeObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Risk assembly ────────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function buildRisks(
  categories: CategoryResult[],
  resultSnapshot: Record<string, unknown> | null,
  ownerDependenceNote: string | null,
  customerConcentrationNote: string | null
): ExitRisk[] {
  const risks: ExitRisk[] = [];
  const seen = new Set<string>();

  function addRisk(r: ExitRisk) {
    if (!seen.has(r.issue)) {
      seen.add(r.issue);
      risks.push(r);
    }
  }

  // From readiness categories
  for (const cat of categories) {
    if (cat.riskLevel === "none" || cat.riskLevel === "low") continue;
    addRisk({
      issue: `${cat.label}: ${cat.recommendedAction}`,
      source: "readiness",
      severity: cat.riskLevel as ExitRisk["severity"],
      action: cat.recommendedAction,
    });
  }

  // From valuation risk factors
  const riskFactors = safeArray<{ label?: string; description?: string; severity?: string; action?: string }>(
    resultSnapshot?.riskFactors
  );
  if (riskFactors) {
    for (const rf of riskFactors) {
      const issue = rf.label ?? rf.description ?? "Valuation risk";
      const severityRaw = rf.severity?.toLowerCase() ?? "medium";
      const severity = (["critical", "high", "medium", "low"].includes(severityRaw)
        ? severityRaw
        : "medium") as ExitRisk["severity"];
      addRisk({
        issue,
        source: "valuation",
        severity,
        action: rf.action ?? "Review with a qualified advisor.",
      });
    }
  }

  // Owner dependence note
  if (ownerDependenceNote) {
    addRisk({
      issue: ownerDependenceNote,
      source: "owner_dependence",
      severity: "high",
      action: "Reduce owner dependence by documenting processes and developing a second-in-command.",
    });
  }

  // Customer concentration note
  if (customerConcentrationNote) {
    addRisk({
      issue: customerConcentrationNote,
      source: "customer_concentration",
      severity: "high",
      action: "Diversify customer base to reduce single-customer revenue dependency.",
    });
  }

  // Missing evidence from categories with missing items
  for (const cat of categories) {
    for (const ev of cat.missingEvidence) {
      addRisk({
        issue: `Missing evidence: ${ev} (${cat.label})`,
        source: "missing_evidence",
        severity: "medium",
        action: `Provide ${ev} to strengthen your sale readiness evidence.`,
      });
    }
  }

  return risks.sort((a, b) => (RISK_ORDER[a.severity] ?? 3) - (RISK_ORDER[b.severity] ?? 3));
}

// ─── Buyer lens ───────────────────────────────────────────────────────────────

const BUYER_TYPE_LABELS: Record<string, string> = {
  owner_operator: "Owner-Operator",
  financial_buyer: "Financial Buyer",
  strategic_buyer: "Strategic Buyer",
};

function buildBuyerLens(resultSnapshot: Record<string, unknown> | null): BuyerLensEntry[] | null {
  const raw = safeArray<Record<string, unknown>>(resultSnapshot?.buyerInterpretations);
  if (!raw || raw.length === 0) return null;

  return raw.map((entry) => {
    const buyerType = (entry.buyerType as string) ?? "owner_operator";
    return {
      buyerType: buyerType as BuyerLensEntry["buyerType"],
      buyerTypeLabel: BUYER_TYPE_LABELS[buyerType] ?? buyerType,
      interpretation: (entry.interpretation as string) ?? "",
      likelyMultipleRange: (entry.likelyMultipleRange as string) ?? "",
      primaryConcerns: safeArray<string>(entry.primaryConcerns) ?? [],
    };
  });
}

// ─── Value drivers ────────────────────────────────────────────────────────────

function buildValueDrivers(resultSnapshot: Record<string, unknown> | null): ValueDriver[] {
  const raw = safeArray<Record<string, unknown>>(resultSnapshot?.valueDrivers);
  if (!raw) return [];
  return raw.map((d) => ({
    label: (d.label as string) ?? (d.name as string) ?? "Driver",
    direction: ((d.direction as string) ?? "positive") as "positive" | "negative",
    description: (d.description as string) ?? "",
  }));
}

// ─── Main builder ─────────────────────────────────────────────────────────────

interface RawAssessmentRow {
  overall_score: number;
  stage: string;
  category_results: unknown;
  strongest_category: string;
  weakest_category: string;
  delta_from_previous: number | null;
  scored_at: string;
}

interface RawValuationRow {
  id: string;
  business_id: string | null;
  business_name: string | null;
  industry: string | null;
  currency: string | null;
  defensive_value: number | null;
  expected_value: number | null;
  strategic_value: number | null;
  confidence_score: number | null;
  result_snapshot: unknown;
  report_level: string | null;
  updated_at: string;
}

export function buildExitIntelligence(
  businessId: string,
  businessName: string,
  assessmentRow: RawAssessmentRow | null,
  valuationRow: RawValuationRow | null
): ExitIntelligenceData {
  // ── Sale readiness ──
  let saleReadiness: SaleReadinessSnapshot | null = null;
  let categories: CategoryResult[] = [];

  if (assessmentRow) {
    categories = (safeArray<CategoryResult>(assessmentRow.category_results) ?? []).map((c) => ({
      ...c,
      label: CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category,
    }));

    saleReadiness = {
      overallScore: assessmentRow.overall_score,
      stage: assessmentRow.stage,
      categories,
      strongestCategory: assessmentRow.strongest_category,
      weakestCategory: assessmentRow.weakest_category,
      deltaFromPrevious: assessmentRow.delta_from_previous,
      scoredAt: assessmentRow.scored_at,
    };
  }

  // ── Valuation ──
  let valuation: ValuationPosition | null = null;
  let resultSnapshot: Record<string, unknown> | null = null;

  if (valuationRow) {
    resultSnapshot = safeObject(valuationRow.result_snapshot);
    valuation = {
      defensiveValue: valuationRow.defensive_value,
      expectedValue: valuationRow.expected_value,
      strategicValue: valuationRow.strategic_value,
      confidenceScore: valuationRow.confidence_score,
      currency: valuationRow.currency ?? "USD",
      reportId: valuationRow.id,
      reportLevel: valuationRow.report_level,
      updatedAt: valuationRow.updated_at,
    };
  }

  // ── Action plan (from existing engine, no duplicate logic) ──
  let actionPlan: ReturnType<typeof buildActionPlan> = [];
  let estimatedMonths: { minMonths: number; maxMonths: number; description: string } | null = null;

  if (saleReadiness) {
    const fakeResult: SaleReadinessResult = {
      overallScore: saleReadiness.overallScore,
      stage: saleReadiness.stage as SaleReadinessResult["stage"],
      stageLabel: saleReadiness.stage,
      categories,
      strongestCategory: saleReadiness.strongestCategory as SaleReadinessResult["strongestCategory"],
      weakestCategory: saleReadiness.weakestCategory as SaleReadinessResult["weakestCategory"],
      deltaFromPrevious: saleReadiness.deltaFromPrevious,
      disclaimer: "",
      scoredAt: saleReadiness.scoredAt,
    };
    actionPlan = buildActionPlan(fakeResult);
    estimatedMonths = estimateTimelineMonths(saleReadiness.overallScore);
  }

  // ── Risks ──
  const ownerNote = (resultSnapshot?.ownerDependenceNote as string | null) ?? null;
  const customerNote = (resultSnapshot?.customerConcentrationNote as string | null) ?? null;
  const risks = buildRisks(categories, resultSnapshot, ownerNote, customerNote);

  // ── Buyer lens ──
  const buyerLens = buildBuyerLens(resultSnapshot);

  // ── Value drivers ──
  const valueDrivers = buildValueDrivers(resultSnapshot);

  return {
    businessId,
    businessName,
    saleReadiness,
    valuation,
    actionPlan,
    estimatedMonths,
    risks,
    buyerLens,
    valueDrivers,
    valueBridgeScenarios: safeArray(resultSnapshot?.valueBridgeScenarios),
    recommendedActions: safeArray(resultSnapshot?.recommendedActions),
    dnaScores: safeObject(resultSnapshot?.dnaScores) ?? null,
  };
}
