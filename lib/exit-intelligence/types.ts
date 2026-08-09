/**
 * Exit Intelligence types.
 *
 * DISCLAIMER: All data is for planning and educational purposes only.
 * Not legal, tax, accounting, brokerage, investment, or certified valuation advice.
 */

import type { CategoryResult, ActionPlanItem } from "@/lib/sale-readiness/engine";

export interface ExitRisk {
  issue: string;
  source: "readiness" | "valuation" | "owner_dependence" | "customer_concentration" | "missing_evidence";
  severity: "critical" | "high" | "medium" | "low";
  action: string;
}

export interface BuyerLensEntry {
  buyerType: "owner_operator" | "financial_buyer" | "strategic_buyer";
  buyerTypeLabel: string;
  interpretation: string;
  likelyMultipleRange: string;
  primaryConcerns: string[];
}

export interface ValueDriver {
  label: string;
  direction: "positive" | "negative";
  description: string;
}

export interface ValuationPosition {
  defensiveValue: number | null;
  expectedValue: number | null;
  strategicValue: number | null;
  confidenceScore: number | null;
  currency: string;
  reportId: string;
  reportLevel: string | null;
  updatedAt: string;
}

export interface SaleReadinessSnapshot {
  overallScore: number;
  stage: string;
  categories: CategoryResult[];
  strongestCategory: string;
  weakestCategory: string;
  deltaFromPrevious: number | null;
  scoredAt: string;
}

export interface ExitIntelligenceData {
  businessId: string;
  businessName: string;

  saleReadiness: SaleReadinessSnapshot | null;
  valuation: ValuationPosition | null;

  /** Derived from buildActionPlan */
  actionPlan: ActionPlanItem[];
  /** Estimated months from estimateTimelineMonths */
  estimatedMonths: { minMonths: number; maxMonths: number; description: string } | null;

  risks: ExitRisk[];
  buyerLens: BuyerLensEntry[] | null;
  valueDrivers: ValueDriver[];

  /** Raw result_snapshot fields from valuation, safely parsed */
  valueBridgeScenarios: unknown[] | null;
  recommendedActions: unknown[] | null;
  dnaScores: unknown | null;
}
