/**
 * Confidence score calculation.
 *
 * Returns a score from 0–100 and the individual factors that composed it.
 * All functions are pure so they can be unit-tested without side-effects.
 */

import type { ValuationInput } from "./types";

interface ConfidenceFactor {
  factor: string;
  score: number;  // 0–100
  weight: number; // relative weight (sum of all weights = 1)
}

/**
 * Calculate a composite confidence score.
 *
 * Higher scores indicate more evidence and more reliable inputs.
 * Lower scores indicate missing data, potential risks, or short history.
 */
export function calculateConfidenceScore(input: ValuationInput): {
  score: number;
  factors: ConfidenceFactor[];
} {
  const factors: ConfidenceFactor[] = [];

  // ── 1. Financial history completeness (weight 0.25) ──
  const yearCount = input.financialYears.length;
  const historyScore = yearCount >= 3 ? 100 : yearCount === 2 ? 65 : 35;
  factors.push({
    factor: "Financial history completeness",
    score: historyScore,
    weight: 0.25,
  });

  // ── 2. Revenue quality (weight 0.20) ──
  const rq = input.revenueQuality;
  // Recurring revenue contributes up to 60 pts
  const recurringScore = Math.min(100, rq.recurringRevenuePct * 1.5);
  // Churn known adds 20 pts; unknown subtracts
  const churnBonus = rq.churnRatePct !== null ? 20 : -10;
  // Contracted revenue adds up to 20 pts
  const contractBonus = Math.min(20, rq.contractedRevenuePct * 0.4);
  const revenueQualityScore = clamp(recurringScore + churnBonus + contractBonus, 0, 100);
  factors.push({
    factor: "Revenue quality and predictability",
    score: Math.round(revenueQualityScore),
    weight: 0.20,
  });

  // ── 3. Customer concentration risk (weight 0.15) ──
  // High concentration = low score
  const largestPct = rq.largestCustomerPct;
  const concentrationScore =
    largestPct <= 10 ? 100
    : largestPct <= 20 ? 80
    : largestPct <= 30 ? 60
    : largestPct <= 50 ? 35
    : 10;
  factors.push({
    factor: "Customer concentration",
    score: concentrationScore,
    weight: 0.15,
  });

  // ── 4. Owner independence (weight 0.15) ──
  const ownerHours = input.ownerEarnings.ownerWeeklyHours;
  const hasKeyEmp = input.operations.hasKeyEmployees;
  const hasProcs = input.operations.hasDocumentedProcedures;
  const hasSystems = input.operations.hasSystemsAndTechnology;

  let independenceScore =
    ownerHours <= 10 ? 100
    : ownerHours <= 20 ? 80
    : ownerHours <= 35 ? 55
    : ownerHours <= 50 ? 35
    : 15;
  if (hasKeyEmp) independenceScore = Math.min(100, independenceScore + 15);
  if (hasProcs) independenceScore = Math.min(100, independenceScore + 10);
  if (hasSystems) independenceScore = Math.min(100, independenceScore + 5);
  factors.push({
    factor: "Owner independence",
    score: Math.round(independenceScore),
    weight: 0.15,
  });

  // ── 5. Documentation quality (weight 0.15) ──
  const ae = input.assetsAndEvidence;
  let docScore = 0;
  if (ae.hasAuditedFinancials) docScore += 40;
  if (ae.hasTaxReturns) docScore += 30;
  if (ae.hasCustomerContracts) docScore += 20;
  if (ae.hasEmployeeAgreements) docScore += 10;
  factors.push({
    factor: "Documentation and evidence quality",
    score: Math.min(100, docScore),
    weight: 0.15,
  });

  // ── 6. Business maturity (weight 0.10) ──
  const currentYear = new Date().getFullYear();
  const ageYears = currentYear - input.businessProfile.yearEstablished;
  const maturityScore =
    ageYears >= 10 ? 100
    : ageYears >= 5 ? 80
    : ageYears >= 3 ? 55
    : ageYears >= 1 ? 30
    : 10;
  factors.push({
    factor: "Business maturity",
    score: maturityScore,
    weight: 0.10,
  });

  // ── Composite ────────────────────────────
  const composite = factors.reduce(
    (acc, f) => acc + f.score * f.weight,
    0
  );

  return {
    score: Math.round(clamp(composite, 0, 100)),
    factors,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
