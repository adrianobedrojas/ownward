/**
 * Valuation engine — server-side only.
 *
 * All calculations run on the server. Do not import this module in client
 * components or expose its output as trusted inputs from the browser.
 *
 * DISCLAIMER: All outputs are preliminary planning estimates for educational
 * purposes only. They are not certified appraisals, fairness opinions,
 * investment recommendations, or guaranteed sale prices.
 */

import { METHODOLOGY_VERSION, INDUSTRY_MULTIPLES } from "./types";
import type {
  ValuationInput,
  ValuationResult,
  NormalizedEarningsRow,
  AdjustmentDetail,
  ValuationDriver,
  RiskFactor,
  MissingEvidence,
  RecommendedAction,
  BuyerInterpretation,
  ValueBridgeScenario,
  DnaScore,
} from "./types";
import {
  calcGrossProfit,
  calcReportedEarnings,
  calcYearSDE,
  yearWeights,
  roundToDollar,
} from "./normalization";
import { calculateConfidenceScore } from "./confidence";

const DISCLAIMER =
  "This report is a preliminary planning estimate produced for educational " +
  "purposes only. It is not a certified appraisal, fairness opinion, " +
  "investment recommendation, or guaranteed sale price. Actual business " +
  "value depends on many factors including buyer motivation, market " +
  "conditions, deal structure, and due diligence findings. Consult " +
  "a qualified valuation professional, accountant, or business broker " +
  "before making significant financial decisions.";

// ─────────────────────────────────────────────
// Multiple adjustment helpers
// ─────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute a multiple adjustment factor (multiplicative) based on risk inputs.
 * Returns a value near 1.0 (neutral), below 1.0 (discount), or above 1.0 (premium).
 */
function calcMultipleAdjustmentFactor(
  input: ValuationInput,
  scenario: "defensive" | "expected" | "strategic"
): { factor: number; details: AdjustmentDetail[] } {
  const details: AdjustmentDetail[] = [];
  let factor = 1.0;

  const { revenueQuality, ownerEarnings, operations, assetsAndEvidence } =
    input;

  // ── Recurring revenue premium ──────────────
  const recAdj =
    revenueQuality.recurringRevenuePct >= 70
      ? scenario === "defensive" ? 0.03 : scenario === "expected" ? 0.08 : 0.15
      : revenueQuality.recurringRevenuePct >= 40
      ? scenario === "defensive" ? 0.01 : scenario === "expected" ? 0.04 : 0.08
      : 0;
  if (recAdj > 0) {
    factor += recAdj;
    details.push({
      label: "Recurring revenue premium",
      direction: "multiple",
      amount: recAdj,
      explanation: `${revenueQuality.recurringRevenuePct.toFixed(0)}% recurring revenue improves buyer confidence in future cash flows.`,
    });
  }

  // ── Customer concentration discount ────────
  const largest = revenueQuality.largestCustomerPct;
  const concDiscount =
    largest >= 50
      ? scenario === "defensive" ? 0.25 : scenario === "expected" ? 0.18 : 0.10
      : largest >= 30
      ? scenario === "defensive" ? 0.15 : scenario === "expected" ? 0.10 : 0.05
      : largest >= 20
      ? scenario === "defensive" ? 0.05 : scenario === "expected" ? 0.03 : 0
      : 0;
  if (concDiscount > 0) {
    factor -= concDiscount;
    details.push({
      label: "Customer concentration discount",
      direction: "multiple",
      amount: -concDiscount,
      explanation: `${largest.toFixed(0)}% revenue from a single customer represents concentration risk a buyer must price in.`,
    });
  }

  // ── Owner dependence discount ───────────────
  const hours = ownerEarnings.ownerWeeklyHours;
  const ownerDiscount =
    hours >= 60
      ? scenario === "defensive" ? 0.20 : scenario === "expected" ? 0.15 : 0.08
      : hours >= 45
      ? scenario === "defensive" ? 0.12 : scenario === "expected" ? 0.08 : 0.04
      : hours >= 30
      ? scenario === "defensive" ? 0.05 : scenario === "expected" ? 0.03 : 0
      : 0;
  if (ownerDiscount > 0) {
    factor -= ownerDiscount;
    details.push({
      label: "Owner dependence discount",
      direction: "multiple",
      amount: -ownerDiscount,
      explanation: `Owner working ${hours} hours/week creates transition risk for a prospective buyer.`,
    });
  }

  // ── Operations premium ───────────────────────
  let opsBonus = 0;
  if (operations.hasDocumentedProcedures) opsBonus += 0.03;
  if (operations.hasSystemsAndTechnology) opsBonus += 0.03;
  if (operations.hasProprietaryIP) opsBonus += 0.05;
  if (operations.hasKeyEmployees && operations.keyEmployeeCount > 0)
    opsBonus += 0.03;
  if (scenario === "defensive") opsBonus *= 0.5;
  if (scenario === "strategic") opsBonus *= 1.3;
  if (opsBonus > 0) {
    factor += opsBonus;
    details.push({
      label: "Operational maturity premium",
      direction: "multiple",
      amount: opsBonus,
      explanation:
        "Documented procedures, systems, proprietary IP, or key employees indicate a more transferable business.",
    });
  }

  // ── Evidence quality premium ─────────────────
  const ae = assetsAndEvidence;
  let evidenceBonus = 0;
  if (ae.hasAuditedFinancials) evidenceBonus += 0.05;
  if (ae.hasTaxReturns) evidenceBonus += 0.03;
  if (ae.hasCustomerContracts) evidenceBonus += 0.02;
  if (scenario === "defensive") evidenceBonus *= 0.4;
  if (scenario === "strategic") evidenceBonus *= 1.2;
  if (evidenceBonus > 0) {
    factor += evidenceBonus;
    details.push({
      label: "Evidence quality premium",
      direction: "multiple",
      amount: evidenceBonus,
      explanation:
        "Audited financials, tax returns, and customer contracts reduce buyer uncertainty and support higher valuations.",
    });
  }

  // ── Replacement manager deduction ──────────
  // If owner hours are high and a replacement manager would be needed,
  // we reflect that cost in the multiple.
  const rmSalary = ownerEarnings.replacementManagerSalary;
  if (rmSalary > 0 && hours >= 30) {
    details.push({
      label: "Replacement manager cost note",
      direction: "multiple",
      amount: 0,
      explanation: `A replacement manager earning ~$${rmSalary.toLocaleString()}/yr has been accounted for in the normalized earnings calculation.`,
    });
  }

  return { factor: clamp(factor, 0.3, 3.0), details };
}

// ─────────────────────────────────────────────
// Value drivers, risks, missing evidence
// ─────────────────────────────────────────────

function buildValueDrivers(input: ValuationInput): ValuationDriver[] {
  const drivers: ValuationDriver[] = [];
  const { revenueQuality, operations, assetsAndEvidence, businessProfile } =
    input;

  const ageYears =
    new Date().getFullYear() - businessProfile.yearEstablished;

  if (revenueQuality.recurringRevenuePct >= 50) {
    drivers.push({
      label: "Strong recurring revenue",
      description: `${revenueQuality.recurringRevenuePct.toFixed(0)}% of revenue is recurring, improving predictability for buyers.`,
      impact: "positive",
    });
  }

  if (revenueQuality.largestCustomerPct <= 15) {
    drivers.push({
      label: "Diversified customer base",
      description: "No single customer represents a dominant share of revenue.",
      impact: "positive",
    });
  }

  if (operations.hasDocumentedProcedures) {
    drivers.push({
      label: "Documented operating procedures",
      description: "Documented procedures lower operational transition risk for a new owner.",
      impact: "positive",
    });
  }

  if (operations.hasProprietaryIP) {
    drivers.push({
      label: "Proprietary IP or assets",
      description: "Proprietary intellectual property or unique assets create a defensible competitive position.",
      impact: "positive",
    });
  }

  if (assetsAndEvidence.hasAuditedFinancials) {
    drivers.push({
      label: "Audited financial statements",
      description: "Audited financials provide strong evidence of reported performance and reduce buyer risk.",
      impact: "positive",
    });
  }

  if (ageYears >= 7) {
    drivers.push({
      label: "Established business history",
      description: `${ageYears} years in operation demonstrates durability through multiple market cycles.`,
      impact: "positive",
    });
  }

  if (revenueQuality.contractedRevenuePct >= 30) {
    drivers.push({
      label: "Contracted revenue base",
      description: `${revenueQuality.contractedRevenuePct.toFixed(0)}% of revenue is under contract, providing forward visibility.`,
      impact: "positive",
    });
  }

  if (operations.hasKeyEmployees && operations.keyEmployeeCount > 0) {
    drivers.push({
      label: "Key employees in place",
      description: "Experienced employees who can operate independently reduce transition dependency on the owner.",
      impact: "positive",
    });
  }

  return drivers;
}

function buildRiskFactors(input: ValuationInput): RiskFactor[] {
  const risks: RiskFactor[] = [];
  const { revenueQuality, ownerEarnings, operations, assetsAndEvidence } =
    input;

  const largest = revenueQuality.largestCustomerPct;
  if (largest >= 50) {
    risks.push({
      label: "Critical customer concentration",
      description: `A single customer represents ${largest.toFixed(0)}% of revenue. Loss of this customer would be a material event.`,
      severity: "high",
    });
  } else if (largest >= 30) {
    risks.push({
      label: "High customer concentration",
      description: `A single customer represents ${largest.toFixed(0)}% of revenue. Buyers will typically require a concentration discount.`,
      severity: "medium",
    });
  } else if (largest >= 20) {
    risks.push({
      label: "Moderate customer concentration",
      description: `The largest customer accounts for ${largest.toFixed(0)}% of revenue. Diversification would improve value.`,
      severity: "low",
    });
  }

  const hours = ownerEarnings.ownerWeeklyHours;
  if (hours >= 50) {
    risks.push({
      label: "High owner dependence",
      description: `Owner works ${hours} hours/week. The business may struggle to operate effectively post-sale without a capable replacement.`,
      severity: "high",
    });
  } else if (hours >= 35) {
    risks.push({
      label: "Moderate owner dependence",
      description: `Owner works ${hours} hours/week. Reducing owner involvement would improve transferability and value.`,
      severity: "medium",
    });
  }

  if (!assetsAndEvidence.hasTaxReturns) {
    risks.push({
      label: "Tax returns not available",
      description: "Most buyers and lenders require at least 3 years of business tax returns to verify performance.",
      severity: "high",
    });
  }

  if (!operations.hasDocumentedProcedures) {
    risks.push({
      label: "No documented operating procedures",
      description: "Without documented procedures, operational knowledge resides with the owner and key staff, increasing transition risk.",
      severity: "medium",
    });
  }

  if (revenueQuality.churnRatePct !== null && revenueQuality.churnRatePct >= 20) {
    risks.push({
      label: "High customer churn",
      description: `${revenueQuality.churnRatePct.toFixed(0)}% annual churn rate is a negative signal for revenue durability.`,
      severity: "high",
    });
  }

  return risks;
}

function buildMissingEvidence(input: ValuationInput): MissingEvidence[] {
  const missing: MissingEvidence[] = [];
  const { assetsAndEvidence, revenueQuality, operations } = input;

  if (!assetsAndEvidence.hasAuditedFinancials) {
    missing.push({
      label: "Audited financial statements",
      whyItMatters: "Audited financials provide third-party verification of performance and are required by many serious buyers and SBA lenders.",
    });
  }

  if (!assetsAndEvidence.hasTaxReturns) {
    missing.push({
      label: "Business tax returns (3 years)",
      whyItMatters: "Tax returns are typically the primary evidence of earnings in small business transactions.",
    });
  }

  if (!assetsAndEvidence.hasCustomerContracts) {
    missing.push({
      label: "Customer contracts",
      whyItMatters: "Contracts demonstrate the durability of revenue relationships and support a higher valuation.",
    });
  }

  if (!assetsAndEvidence.hasEmployeeAgreements) {
    missing.push({
      label: "Employee agreements",
      whyItMatters: "Non-compete and employment agreements protect the business from key-person departure post-sale.",
    });
  }

  if (!operations.hasDocumentedProcedures) {
    missing.push({
      label: "Documented operating procedures (SOPs)",
      whyItMatters: "SOPs make the business more transferable and reduce buyer-perceived transition risk.",
    });
  }

  if (revenueQuality.churnRatePct === null && revenueQuality.recurringRevenuePct > 0) {
    missing.push({
      label: "Customer churn rate",
      whyItMatters: "Knowing the annual churn rate allows buyers to model the durability of recurring revenue.",
    });
  }

  return missing;
}

function buildRecommendedActions(
  input: ValuationInput,
  risks: RiskFactor[]
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const { ownerEarnings, operations, assetsAndEvidence, revenueQuality } = input;

  const hasHighConcentration = risks.some(
    (r) => r.label.includes("concentration") && r.severity === "high"
  );
  const hasHighOwnerDependence = risks.some(
    (r) => r.label.includes("owner dependence") && r.severity === "high"
  );

  if (hasHighOwnerDependence || ownerEarnings.ownerWeeklyHours >= 35) {
    actions.push({
      priority: "immediate",
      action: "Reduce owner working hours through delegation or hiring",
      potentialImpact: "Reducing owner dependence is one of the highest-leverage actions to increase transferability and buyer-perceived value.",
    });
  }

  if (hasHighConcentration) {
    actions.push({
      priority: "immediate",
      action: "Actively diversify the customer base",
      potentialImpact: "Reducing the largest customer below 20% of revenue can materially improve the multiple a buyer will pay.",
    });
  }

  if (!assetsAndEvidence.hasTaxReturns) {
    actions.push({
      priority: "immediate",
      action: "Compile at least 3 years of business tax returns",
      potentialImpact: "Tax returns are typically required to access SBA financing, which dramatically expands the buyer pool.",
    });
  }

  if (!operations.hasDocumentedProcedures) {
    actions.push({
      priority: "short-term",
      action: "Document key operating procedures and workflows",
      potentialImpact: "Documented SOPs improve buyer confidence and support a higher multiple.",
    });
  }

  if (!assetsAndEvidence.hasCustomerContracts && revenueQuality.recurringRevenuePct > 30) {
    actions.push({
      priority: "short-term",
      action: "Move key customers to written contracts",
      potentialImpact: "Contracted recurring revenue is more defensible to a buyer than at-will relationships.",
    });
  }

  if (!assetsAndEvidence.hasAuditedFinancials) {
    actions.push({
      priority: "long-term",
      action: "Consider engaging an accountant to review or compile financial statements",
      potentialImpact: "Reviewed or compiled financials increase credibility, especially for transactions above $1M.",
    });
  }

  if (revenueQuality.recurringRevenuePct < 30) {
    actions.push({
      priority: "long-term",
      action: "Develop recurring revenue streams (subscriptions, retainers, service contracts)",
      potentialImpact: "Higher recurring revenue percentage typically supports higher valuation multiples.",
    });
  }

  return actions;
}

function buildBuyerInterpretations(
  input: ValuationInput,
  expectedValue: number,
  expectedMultiple: number
): BuyerInterpretation[] {
  const { revenueQuality, ownerEarnings, operations } = input;
  const industryConfig = INDUSTRY_MULTIPLES[input.businessProfile.industry];

  return [
    {
      buyerType: "owner-operator",
      label: "Owner-operator",
      interpretation:
        `An owner-operator buyer is purchasing a job and a cash-flow stream. ` +
        `They will focus heavily on the business's ability to generate personal income ` +
        `and will scrutinize owner hours (${ownerEarnings.ownerWeeklyHours} hrs/week) ` +
        `and what the business requires to run effectively. ` +
        `They are typically the largest buyer pool for small businesses.`,
      likelyMultipleRange: industryConfig.defensiveRange,
      primaryConcerns: [
        "How many hours per week the business requires",
        "What specialized skills or relationships are needed",
        ownerEarnings.ownerWeeklyHours >= 40 ? "High owner time commitment" : "Owner time requirements",
        revenueQuality.largestCustomerPct >= 25 ? "Customer concentration risk" : "Customer stability",
      ],
    },
    {
      buyerType: "financial",
      label: "Financial buyer",
      interpretation:
        `A financial buyer (private equity, search fund, or sophisticated investor) ` +
        `is primarily focused on return on investment and cash-flow yield. ` +
        `They will apply professional due diligence and may require audited financials. ` +
        `A ${expectedMultiple.toFixed(1)}x normalized earnings multiple ` +
        `implies a ${((1 / expectedMultiple) * 100).toFixed(0)}% cash-on-cash yield before debt service, ` +
        `which they will compare to alternative uses of capital.`,
      likelyMultipleRange: industryConfig.expectedRange,
      primaryConcerns: [
        "Verified, audited financial statements",
        "Management team depth and key-person risk",
        "Revenue concentration and customer quality",
        operations.hasDocumentedProcedures ? "Operational scalability" : "Lack of documented procedures",
      ],
    },
    {
      buyerType: "strategic",
      label: "Strategic buyer",
      interpretation:
        `A strategic buyer is an operating company in a related industry ` +
        `seeking to acquire customers, capabilities, technology, or market position. ` +
        `They may pay a premium above the income-based value because the acquisition ` +
        `creates synergies in their existing business. ` +
        `Strategic value of $${expectedValue.toLocaleString()} or higher ` +
        `is possible if this business complements a larger acquirer's operations.`,
      likelyMultipleRange: industryConfig.strategicRange,
      primaryConcerns: [
        "Customer and market overlap",
        operations.hasProprietaryIP ? "Proprietary IP and technology" : "Competitive differentiation",
        "Integration complexity",
        "Key employee retention",
      ],
    },
  ];
}

function buildValueBridgeScenarios(
  input: ValuationInput,
  expectedValue: number,
  expectedMultiple: number,
  normalizedEarnings: number
): ValueBridgeScenario[] {
  const scenarios: ValueBridgeScenario[] = [];
  const { revenueQuality, ownerEarnings } = input;

  const caveat =
    "Modeled improvements are illustrative scenarios based on planning assumptions. " +
    "They are not guaranteed and depend on execution, market conditions, and buyer perception.";

  // Scenario 1: Reduce owner hours
  if (ownerEarnings.ownerWeeklyHours >= 35) {
    const multipleIncrease = 0.25;
    const modeledValue = roundToDollar(
      normalizedEarnings * (expectedMultiple + multipleIncrease)
    );
    scenarios.push({
      label: "Reduce owner working hours",
      description: `Reduce owner involvement to under 20 hrs/week through delegation or hiring, potentially improving the buyer-perceived multiple by ~${multipleIncrease.toFixed(2)}x.`,
      driver: "owner_dependence",
      deltaAmount: modeledValue - expectedValue,
      modeledValue,
      caveat,
    });
  }

  // Scenario 2: Improve recurring revenue
  if (revenueQuality.recurringRevenuePct < 50) {
    const targetRecurring = Math.min(100, revenueQuality.recurringRevenuePct + 25);
    const multipleIncrease = 0.2;
    const modeledValue = roundToDollar(
      normalizedEarnings * (expectedMultiple + multipleIncrease)
    );
    scenarios.push({
      label: "Grow recurring revenue",
      description: `Increasing recurring revenue from ${revenueQuality.recurringRevenuePct.toFixed(0)}% to ~${targetRecurring.toFixed(0)}% through subscriptions or retainers could improve the multiple by ~${multipleIncrease.toFixed(2)}x.`,
      driver: "recurring_revenue",
      deltaAmount: modeledValue - expectedValue,
      modeledValue,
      caveat,
    });
  }

  // Scenario 3: Reduce customer concentration
  if (revenueQuality.largestCustomerPct >= 25) {
    const multipleIncrease = 0.3;
    const modeledValue = roundToDollar(
      normalizedEarnings * (expectedMultiple + multipleIncrease)
    );
    scenarios.push({
      label: "Diversify customer base",
      description: `Reducing the largest customer from ${revenueQuality.largestCustomerPct.toFixed(0)}% to under 15% of revenue could improve the concentration-adjusted multiple by ~${multipleIncrease.toFixed(2)}x.`,
      driver: "customer_concentration",
      deltaAmount: modeledValue - expectedValue,
      modeledValue,
      caveat,
    });
  }

  // Scenario 4: Add documented procedures
  if (!input.operations.hasDocumentedProcedures) {
    const multipleIncrease = 0.15;
    const modeledValue = roundToDollar(
      normalizedEarnings * (expectedMultiple + multipleIncrease)
    );
    scenarios.push({
      label: "Document operating procedures",
      description: `Creating documented SOPs and operating playbooks could improve transferability and support a ~${multipleIncrease.toFixed(2)}x multiple improvement.`,
      driver: "operational_documentation",
      deltaAmount: modeledValue - expectedValue,
      modeledValue,
      caveat,
    });
  }

  return scenarios;
}

function buildDnaScores(input: ValuationInput): DnaScore[] {
  const { revenueQuality, ownerEarnings, operations, assetsAndEvidence } =
    input;
  const ageYears =
    new Date().getFullYear() - input.businessProfile.yearEstablished;

  // Earnings quality
  const earningsQuality = Math.min(
    100,
    (input.financialYears.length >= 3 ? 40 : 20) +
      (assetsAndEvidence.hasTaxReturns ? 30 : 0) +
      (assetsAndEvidence.hasAuditedFinancials ? 30 : 0)
  );

  // Revenue predictability
  const revPredictability = Math.round(
    clamp(
      revenueQuality.recurringRevenuePct * 0.6 +
        revenueQuality.contractedRevenuePct * 0.4,
      0,
      100
    )
  );

  // Customer diversification
  const custDiversification =
    revenueQuality.largestCustomerPct <= 10 ? 100
    : revenueQuality.largestCustomerPct <= 20 ? 75
    : revenueQuality.largestCustomerPct <= 35 ? 50
    : revenueQuality.largestCustomerPct <= 50 ? 25
    : 10;

  // Owner independence
  const ownerIndependence = clamp(
    (ownerEarnings.ownerWeeklyHours <= 10 ? 90
    : ownerEarnings.ownerWeeklyHours <= 20 ? 70
    : ownerEarnings.ownerWeeklyHours <= 35 ? 45
    : ownerEarnings.ownerWeeklyHours <= 50 ? 25
    : 10) +
      (operations.hasKeyEmployees ? 10 : 0),
    0,
    100
  );

  // Operational maturity
  const opsMaturity = Math.min(
    100,
    (operations.hasDocumentedProcedures ? 35 : 0) +
      (operations.hasSystemsAndTechnology ? 30 : 0) +
      (operations.hasKeyEmployees ? 25 : 0) +
      (operations.hasProprietaryIP ? 10 : 0)
  );

  // Documentation quality
  const docQuality = Math.min(
    100,
    (assetsAndEvidence.hasAuditedFinancials ? 40 : 0) +
      (assetsAndEvidence.hasTaxReturns ? 30 : 0) +
      (assetsAndEvidence.hasCustomerContracts ? 20 : 0) +
      (assetsAndEvidence.hasEmployeeAgreements ? 10 : 0)
  );

  // Growth potential (heuristic from age + recurring revenue)
  const growthPotential = Math.round(
    clamp(
      (ageYears <= 3 ? 80 : ageYears <= 7 ? 65 : 50) +
        (revenueQuality.recurringRevenuePct >= 40 ? 20 : 0) -
        (revenueQuality.churnRatePct !== null && revenueQuality.churnRatePct >= 20 ? 20 : 0),
      0,
      100
    )
  );

  // Transferability
  const transferability = Math.round(
    clamp(
      (operations.hasDocumentedProcedures ? 25 : 0) +
        (operations.hasSystemsAndTechnology ? 20 : 0) +
        (operations.hasKeyEmployees ? 20 : 0) +
        (assetsAndEvidence.hasCustomerContracts ? 15 : 0) +
        (assetsAndEvidence.hasEmployeeAgreements ? 10 : 0) +
        (ownerEarnings.ownerWeeklyHours <= 20 ? 10 : 0),
      0,
      100
    )
  );

  const dnaLabel = (score: number) =>
    score >= 80 ? "Strong"
    : score >= 60 ? "Good"
    : score >= 40 ? "Developing"
    : "Needs work";

  return [
    { dimension: "Earnings quality", score: earningsQuality, label: dnaLabel(earningsQuality), explanation: "Quality and verifiability of reported earnings." },
    { dimension: "Revenue predictability", score: revPredictability, label: dnaLabel(revPredictability), explanation: "Mix of recurring and contracted revenue vs. one-time revenue." },
    { dimension: "Customer diversification", score: custDiversification, label: dnaLabel(custDiversification), explanation: "Spread of revenue across the customer base." },
    { dimension: "Owner independence", score: ownerIndependence, label: dnaLabel(ownerIndependence), explanation: "Degree to which the business can operate without the current owner." },
    { dimension: "Operational maturity", score: opsMaturity, label: dnaLabel(opsMaturity), explanation: "Systems, processes, and key personnel that support operations." },
    { dimension: "Documentation quality", score: docQuality, label: dnaLabel(docQuality), explanation: "Quality and completeness of financial and operational records." },
    { dimension: "Growth potential", score: growthPotential, label: dnaLabel(growthPotential), explanation: "Indicators of future growth opportunity." },
    { dimension: "Transferability", score: transferability, label: dnaLabel(transferability), explanation: "How smoothly the business can transition to a new owner." },
  ];
}

// ─────────────────────────────────────────────
// Main engine function
// ─────────────────────────────────────────────

/**
 * Calculate a complete valuation result from validated input.
 * This must only be called from server-side code.
 */
export function calculateValuation(input: ValuationInput): ValuationResult {
  const industryConfig = INDUSTRY_MULTIPLES[input.businessProfile.industry];
  const years = [...input.financialYears].sort(
    (a, b) => a.fiscalYear - b.fiscalYear
  );
  const weights = yearWeights(years.length);

  // ── Normalized earnings rows ─────────────
  const normalizedRows: NormalizedEarningsRow[] = years.map((yr, i) => {
    const sde = calcYearSDE(yr, input.ownerEarnings.addBacks);
    const totalAddBacks = input.ownerEarnings.addBacks
      .filter((ab) => ab.direction === "add")
      .reduce((acc, ab) => acc + ab.amount, 0);
    const totalDeductions = input.ownerEarnings.addBacks
      .filter((ab) => ab.direction === "deduct")
      .reduce((acc, ab) => acc + ab.amount, 0);

    return {
      fiscalYear: yr.fiscalYear,
      revenue: yr.revenue,
      grossProfit: calcGrossProfit(yr),
      operatingExpenses: yr.operatingExpenses,
      reportedEarnings: calcReportedEarnings(yr),
      totalAddBacks:
        totalAddBacks +
        yr.ownerSalary +
        yr.ownerBenefits +
        yr.depreciation +
        yr.amortization +
        yr.interest +
        yr.oneTimeExpenses,
      totalDeductions: totalDeductions + yr.oneTimeRevenue,
      normalizedSDE: sde,
      weight: weights[i],
    };
  });

  // ── Weighted normalized SDE ───────────────
  const weightedNormalizedEarnings = normalizedRows.reduce(
    (acc, row) => acc + row.normalizedSDE * row.weight,
    0
  );

  // ── Replacement manager deduction ─────────
  // If owner works significant hours, we note (but don't re-deduct) the
  // replacement cost — it informs the multiple adjustment narrative.
  const rmSalary = input.ownerEarnings.replacementManagerSalary;
  const ownerHours = input.ownerEarnings.ownerWeeklyHours;
  // For the actual valuation we use weighted earnings as the base.
  // The replacement manager salary should be captured in add-backs if needed.
  const normalizedEarnings = weightedNormalizedEarnings;

  // ── Multiple adjustment factors ────────────
  const defensiveAdj = calcMultipleAdjustmentFactor(input, "defensive");
  const expectedAdj = calcMultipleAdjustmentFactor(input, "expected");
  const strategicAdj = calcMultipleAdjustmentFactor(input, "strategic");

  const [defLow, defHigh] = industryConfig.defensiveRange;
  const [expLow, expHigh] = industryConfig.expectedRange;
  const [strLow, strHigh] = industryConfig.strategicRange;

  const defensiveMultiple = clamp(
    ((defLow + defHigh) / 2) * defensiveAdj.factor,
    defLow * 0.5,
    defHigh * 1.5
  );
  const expectedMultiple = clamp(
    ((expLow + expHigh) / 2) * expectedAdj.factor,
    expLow * 0.5,
    expHigh * 1.5
  );
  const strategicMultiple = clamp(
    ((strLow + strHigh) / 2) * strategicAdj.factor,
    strLow * 0.5,
    strHigh * 1.5
  );

  const defensiveValue = roundToDollar(
    Math.max(0, normalizedEarnings * defensiveMultiple)
  );
  const expectedValue = roundToDollar(
    Math.max(0, normalizedEarnings * expectedMultiple)
  );
  const strategicValue = roundToDollar(
    Math.max(0, normalizedEarnings * strategicMultiple)
  );

  // ── Adjustments list ─────────────────────
  const allAdjustments: AdjustmentDetail[] = [
    ...input.ownerEarnings.addBacks.map((ab) => ({
      label: ab.label,
      direction: ab.direction as "add" | "deduct",
      amount: ab.amount,
      explanation: ab.explanation || "",
    })),
    ...expectedAdj.details,
  ];

  // ── Confidence ───────────────────────────
  const { score: confidenceScore, factors: confidenceFactors } =
    calculateConfidenceScore(input);

  // ── Qualitative analysis ─────────────────
  const valueDrivers = buildValueDrivers(input);
  const riskFactors = buildRiskFactors(input);
  const missingEvidence = buildMissingEvidence(input);
  const recommendedActions = buildRecommendedActions(input, riskFactors);

  // ── Owner-dependence and concentration notes ──
  const ownerDependenceNote =
    ownerHours >= 40
      ? `The current owner works approximately ${ownerHours} hours per week. This level of involvement is a significant consideration for buyers and may limit the pool of viable acquirers. Reducing owner hours before a sale is typically high-leverage.`
      : ownerHours >= 20
      ? `The current owner works approximately ${ownerHours} hours per week. Some owner involvement will be expected, but this is manageable for most buyers.`
      : `The current owner works approximately ${ownerHours} hours per week, suggesting the business is relatively independent of any single individual.`;

  const largestPct = input.revenueQuality.largestCustomerPct;
  const customerConcentrationNote =
    largestPct >= 30
      ? `The largest customer accounts for ${largestPct.toFixed(0)}% of revenue. Buyers will typically negotiate a lower price or require an earnout structure to mitigate the risk of customer loss post-sale.`
      : largestPct >= 15
      ? `The largest customer accounts for ${largestPct.toFixed(0)}% of revenue. This is worth monitoring but is within a range that most buyers can accept with standard due diligence.`
      : `Revenue appears reasonably distributed across the customer base, which is a positive signal to buyers.`;

  const rmNote =
    rmSalary > 0 && ownerHours >= 30
      ? ` A replacement manager would cost approximately $${rmSalary.toLocaleString()}/year and should be reflected in the earnings normalization if not already captured.`
      : "";

  // ── Creative components ───────────────────
  const buyerInterpretations = buildBuyerInterpretations(
    input,
    expectedValue,
    expectedMultiple
  );
  const valueBridgeScenarios = buildValueBridgeScenarios(
    input,
    expectedValue,
    expectedMultiple,
    normalizedEarnings
  );
  const dnaScores = buildDnaScores(input);

  return {
    methodologyVersion: METHODOLOGY_VERSION,
    normalizedEarnings,
    weightedNormalizedEarnings,
    normalizedEarningsRows: normalizedRows,
    adjustments: allAdjustments,
    defensiveValue,
    expectedValue,
    strategicValue,
    defensiveMultiple: Math.round(defensiveMultiple * 100) / 100,
    expectedMultiple: Math.round(expectedMultiple * 100) / 100,
    strategicMultiple: Math.round(strategicMultiple * 100) / 100,
    confidenceScore,
    confidenceFactors,
    valueDrivers,
    riskFactors,
    missingEvidence,
    recommendedActions,
    buyerInterpretations,
    valueBridgeScenarios,
    dnaScores,
    ownerDependenceNote: ownerDependenceNote + rmNote,
    customerConcentrationNote,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}
