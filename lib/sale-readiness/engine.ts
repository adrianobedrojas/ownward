/**
 * Sale-Readiness Scoring Engine
 *
 * Pure, deterministic 0–100 scoring engine with 10 categories.
 * No I/O — accepts plain data objects and returns a structured result.
 *
 * DISCLAIMER: This assessment is not a professional appraisal, audit, legal
 * opinion, certified financial analysis, or guaranteed predictor of a
 * successful sale. It is a structured self-assessment tool to help owners
 * identify gaps in their readiness to pursue a sale.
 */

// ─── Category keys ────────────────────────────────────────────────────────────

export const SALE_READINESS_CATEGORIES = [
  "financial_quality",
  "financial_documentation",
  "customer_diversification",
  "recurring_revenue",
  "owner_independence",
  "operational_transferability",
  "legal_org_records",
  "team_continuity",
  "technology_process",
  "buyer_preparation",
] as const;

export type SaleReadinessCategory = (typeof SALE_READINESS_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<SaleReadinessCategory, string> = {
  financial_quality: "Financial Quality",
  financial_documentation: "Financial Documentation",
  customer_diversification: "Customer Diversification",
  recurring_revenue: "Recurring & Contracted Revenue",
  owner_independence: "Owner Independence",
  operational_transferability: "Operational Transferability",
  legal_org_records: "Legal & Org Records",
  team_continuity: "Team Continuity",
  technology_process: "Technology & Process Maturity",
  buyer_preparation: "Buyer Preparation",
};

// ─── Risk levels ─────────────────────────────────────────────────────────────

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

export function riskLevelFromScore(score: number): RiskLevel {
  if (score < 20) return "critical";
  if (score < 40) return "high";
  if (score < 60) return "medium";
  if (score < 80) return "low";
  return "none";
}

// ─── Overall readiness stage ─────────────────────────────────────────────────

export type ReadinessStage =
  | "early_preparation"
  | "building_readiness"
  | "approaching_market"
  | "buyer_ready";

export function readinessStageFromScore(overall: number): ReadinessStage {
  if (overall < 25) return "early_preparation";
  if (overall < 50) return "building_readiness";
  if (overall < 75) return "approaching_market";
  return "buyer_ready";
}

export const READINESS_STAGE_LABELS: Record<ReadinessStage, string> = {
  early_preparation: "Early Preparation",
  building_readiness: "Building Readiness",
  approaching_market: "Approaching Market",
  buyer_ready: "Buyer-Ready",
};

// ─── Evidence source labeling ─────────────────────────────────────────────────

export type EvidenceSource = "derived" | "user_entered" | "missing" | "unverified";

// ─── Input types ──────────────────────────────────────────────────────────────

export type SaleReadinessInput = {
  // Financial quality
  hasThreeYearFinancials: boolean;
  hasCleanBooks: boolean; // bookkeeping entries present
  revenueGrowthPositive: boolean | null;
  ebitdaMarginPct: number | null; // 0–100

  // Financial documentation
  hasAuditedFinancials: boolean;
  hasRecentTaxReturns: boolean; // last 2 years
  hasMonthlyPnl: boolean;
  hasBankStatements: boolean;

  // Customer diversification
  topCustomerRevenuePct: number | null; // 0–100, highest single customer
  top5CustomerRevenuePct: number | null; // 0–100
  customerCount: number | null;

  // Recurring / contracted revenue
  recurringRevenuePct: number | null; // 0–100
  hasActiveContracts: boolean;
  avgContractLengthMonths: number | null;

  // Owner independence
  ownerHoursPerWeek: number | null; // how many hours owner works in biz
  hasDocumentedProcesses: boolean;
  hasSecondInCommand: boolean;

  // Operational transferability
  hasOperationsManual: boolean;
  hasVendorContracts: boolean;
  hasKeySystemsDocumented: boolean;

  // Legal & org records
  hasFormationDocs: boolean;
  hasCleanCapTable: boolean;
  hasActiveIpProtection: boolean | "not_applicable" | null;
  hasNoMajorLitigation: boolean;

  // Team continuity
  hasKeyEmployeeContracts: boolean;
  avgEmployeeTenureYears: number | null;
  hasSuccessionPlan: boolean;

  // Technology & process maturity
  hasTechDocumentation: boolean;
  hasAutomatedProcesses: boolean;
  hasCyberSecurityMeasures: boolean;

  // Buyer preparation
  hasValuationReport: boolean;
  hasListingOrTeaserDoc: boolean;
  hasNdaTemplate: boolean;
  hasIdentifiedBuyerProfiles: boolean;
};

// ─── Category result ──────────────────────────────────────────────────────────

export type CategoryResult = {
  category: SaleReadinessCategory;
  label: string;
  score: number; // 0–100
  confidence: number; // 0–100 (how much evidence we have)
  freshness: number; // 0–100 (100 = fully fresh, 0 = stale/missing)
  missingEvidence: string[];
  riskLevel: RiskLevel;
  recommendedAction: string;
};

// ─── Full assessment result ───────────────────────────────────────────────────

export type SaleReadinessResult = {
  overallScore: number; // 0–100, weighted average
  stage: ReadinessStage;
  stageLabel: string;
  categories: CategoryResult[];
  strongestCategory: SaleReadinessCategory;
  weakestCategory: SaleReadinessCategory;
  deltaFromPrevious: number | null; // null if no previous snapshot
  disclaimer: string;
  scoredAt: string; // ISO timestamp
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function boolScore(value: boolean | null | undefined, weight = 100): number {
  if (value === null || value === undefined) return 0;
  return value ? weight : 0;
}

function rangeScore(value: number | null | undefined, low: number, high: number): number {
  if (value === null || value === undefined) return 0;
  if (value >= high) return 100;
  if (value <= low) return 0;
  return Math.round(((value - low) / (high - low)) * 100);
}

function inverseRangeScore(value: number | null | undefined, low: number, high: number): number {
  if (value === null || value === undefined) return 0;
  if (value <= low) return 100;
  if (value >= high) return 0;
  return Math.round(((high - value) / (high - low)) * 100);
}

function avg(...scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function countDefined(...values: (boolean | number | null | undefined)[]): number {
  return values.filter((v) => v !== null && v !== undefined).length;
}

// ─── Category scoring functions ───────────────────────────────────────────────

function scoreFinancialQuality(input: SaleReadinessInput): CategoryResult {
  const scores: number[] = [
    boolScore(input.hasThreeYearFinancials),
    boolScore(input.hasCleanBooks),
    boolScore(input.revenueGrowthPositive),
    input.ebitdaMarginPct !== null ? rangeScore(input.ebitdaMarginPct, 0, 20) : 0,
  ];

  const missing: string[] = [];
  if (!input.hasThreeYearFinancials) missing.push("3 years of financial history");
  if (!input.hasCleanBooks) missing.push("Clean bookkeeping records");
  if (input.revenueGrowthPositive === null) missing.push("Revenue growth trend");
  if (input.ebitdaMarginPct === null) missing.push("EBITDA / profit margin data");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasThreeYearFinancials,
    input.hasCleanBooks,
    input.revenueGrowthPositive,
    input.ebitdaMarginPct
  );
  const confidence = Math.round((defined / 4) * 100);

  return {
    category: "financial_quality",
    label: CATEGORY_LABELS.financial_quality,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Ensure 3+ years of clean, organized financials and positive revenue trend."
        : "Maintain consistent bookkeeping and document EBITDA margin improvement.",
  };
}

function scoreFinancialDocumentation(input: SaleReadinessInput): CategoryResult {
  const scores = [
    boolScore(input.hasRecentTaxReturns),
    boolScore(input.hasMonthlyPnl),
    boolScore(input.hasBankStatements),
    boolScore(input.hasAuditedFinancials) * 0.5 + 50 * 0.5, // audited is bonus, not required
  ];

  const missing: string[] = [];
  if (!input.hasRecentTaxReturns) missing.push("Last 2 years of tax returns");
  if (!input.hasMonthlyPnl) missing.push("Monthly profit & loss statements");
  if (!input.hasBankStatements) missing.push("Bank statements");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasRecentTaxReturns,
    input.hasMonthlyPnl,
    input.hasBankStatements
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "financial_documentation",
    label: CATEGORY_LABELS.financial_documentation,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Upload recent tax returns, monthly P&L, and bank statements to your document vault."
        : "Consider professional review or compilation for buyer credibility.",
  };
}

function scoreCustomerDiversification(input: SaleReadinessInput): CategoryResult {
  const topScore =
    input.topCustomerRevenuePct !== null
      ? inverseRangeScore(input.topCustomerRevenuePct, 15, 50)
      : 0;
  const top5Score =
    input.top5CustomerRevenuePct !== null
      ? inverseRangeScore(input.top5CustomerRevenuePct, 40, 80)
      : 0;
  const countScore =
    input.customerCount !== null ? rangeScore(input.customerCount, 1, 20) : 0;

  const missing: string[] = [];
  if (input.topCustomerRevenuePct === null) missing.push("Top customer revenue %");
  if (input.top5CustomerRevenuePct === null) missing.push("Top 5 customers revenue %");
  if (input.customerCount === null) missing.push("Total active customer count");

  const score = avg(topScore, top5Score, countScore);
  const defined = countDefined(
    input.topCustomerRevenuePct,
    input.top5CustomerRevenuePct,
    input.customerCount
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "customer_diversification",
    label: CATEGORY_LABELS.customer_diversification,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Reduce revenue concentration. Aim for no single customer exceeding 15% of revenue."
        : "Document customer diversification data for buyer due diligence.",
  };
}

function scoreRecurringRevenue(input: SaleReadinessInput): CategoryResult {
  const recurringScore =
    input.recurringRevenuePct !== null
      ? rangeScore(input.recurringRevenuePct, 0, 70)
      : 0;
  const contractScore = boolScore(input.hasActiveContracts);
  const lengthScore =
    input.avgContractLengthMonths !== null
      ? rangeScore(input.avgContractLengthMonths, 0, 24)
      : 0;

  const missing: string[] = [];
  if (input.recurringRevenuePct === null) missing.push("Recurring revenue %");
  if (!input.hasActiveContracts) missing.push("Active customer contracts");
  if (input.avgContractLengthMonths === null) missing.push("Average contract length");

  const score = avg(recurringScore, contractScore, lengthScore);
  const defined = countDefined(
    input.recurringRevenuePct,
    input.hasActiveContracts,
    input.avgContractLengthMonths
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "recurring_revenue",
    label: CATEGORY_LABELS.recurring_revenue,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Increase recurring/contracted revenue percentage and document active contracts."
        : "Ensure contracts are assignable or consent procedures are documented.",
  };
}

function scoreOwnerIndependence(input: SaleReadinessInput): CategoryResult {
  const hoursScore =
    input.ownerHoursPerWeek !== null
      ? inverseRangeScore(input.ownerHoursPerWeek, 10, 60)
      : 0;
  const processScore = boolScore(input.hasDocumentedProcesses);
  const secondScore = boolScore(input.hasSecondInCommand);

  const missing: string[] = [];
  if (input.ownerHoursPerWeek === null) missing.push("Owner hours per week in business");
  if (!input.hasDocumentedProcesses) missing.push("Documented operating procedures");
  if (!input.hasSecondInCommand) missing.push("Second-in-command or management team");

  const score = avg(hoursScore, processScore, secondScore);
  const defined = countDefined(
    input.ownerHoursPerWeek,
    input.hasDocumentedProcesses,
    input.hasSecondInCommand
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "owner_independence",
    label: CATEGORY_LABELS.owner_independence,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Reduce owner dependency by documenting processes and building a management layer."
        : "Demonstrate the business can operate without daily owner involvement.",
  };
}

function scoreOperationalTransferability(input: SaleReadinessInput): CategoryResult {
  const scores = [
    boolScore(input.hasOperationsManual),
    boolScore(input.hasVendorContracts),
    boolScore(input.hasKeySystemsDocumented),
  ];

  const missing: string[] = [];
  if (!input.hasOperationsManual) missing.push("Operations manual or runbook");
  if (!input.hasVendorContracts) missing.push("Vendor and supplier contracts");
  if (!input.hasKeySystemsDocumented) missing.push("Key systems and tools documentation");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasOperationsManual,
    input.hasVendorContracts,
    input.hasKeySystemsDocumented
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "operational_transferability",
    label: CATEGORY_LABELS.operational_transferability,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Create an operations manual and document all key vendor relationships and systems."
        : "Verify all vendor contracts are assignable and systems are documented.",
  };
}

function scoreLegalOrgRecords(input: SaleReadinessInput): CategoryResult {
  const scores = [
    boolScore(input.hasFormationDocs),
    boolScore(input.hasCleanCapTable),
    boolScore(input.hasNoMajorLitigation),
    input.hasActiveIpProtection !== null ? boolScore(input.hasActiveIpProtection) : 50,
  ];

  const missing: string[] = [];
  if (!input.hasFormationDocs) missing.push("Formation documents (articles, bylaws, operating agreement)");
  if (!input.hasCleanCapTable) missing.push("Clean cap table / ownership records");
  if (input.hasActiveIpProtection === null) missing.push("IP protection status (patents, trademarks)");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasFormationDocs,
    input.hasCleanCapTable,
    input.hasNoMajorLitigation,
    input.hasActiveIpProtection
  );
  const confidence = Math.round((defined / 4) * 100);

  return {
    category: "legal_org_records",
    label: CATEGORY_LABELS.legal_org_records,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Organize formation documents, ownership records, and resolve any legal issues."
        : "Consult legal counsel to ensure clean title and no outstanding liabilities.",
  };
}

function scoreTeamContinuity(input: SaleReadinessInput): CategoryResult {
  const tenureScore =
    input.avgEmployeeTenureYears !== null
      ? rangeScore(input.avgEmployeeTenureYears, 0, 5)
      : 0;
  const contractScore = boolScore(input.hasKeyEmployeeContracts);
  const successionScore = boolScore(input.hasSuccessionPlan);

  const missing: string[] = [];
  if (!input.hasKeyEmployeeContracts) missing.push("Key employee agreements");
  if (input.avgEmployeeTenureYears === null) missing.push("Average employee tenure");
  if (!input.hasSuccessionPlan) missing.push("Succession or continuity plan");

  const score = avg(tenureScore, contractScore, successionScore);
  const defined = countDefined(
    input.hasKeyEmployeeContracts,
    input.avgEmployeeTenureYears,
    input.hasSuccessionPlan
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "team_continuity",
    label: CATEGORY_LABELS.team_continuity,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Document key employee agreements and build a continuity plan to retain talent post-sale."
        : "Ensure key employees are aware of and supportive of a potential transition.",
  };
}

function scoreTechnologyProcess(input: SaleReadinessInput): CategoryResult {
  const scores = [
    boolScore(input.hasTechDocumentation),
    boolScore(input.hasAutomatedProcesses),
    boolScore(input.hasCyberSecurityMeasures),
  ];

  const missing: string[] = [];
  if (!input.hasTechDocumentation) missing.push("Technology stack documentation");
  if (!input.hasAutomatedProcesses) missing.push("Automated or repeatable processes");
  if (!input.hasCyberSecurityMeasures) missing.push("Cybersecurity measures");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasTechDocumentation,
    input.hasAutomatedProcesses,
    input.hasCyberSecurityMeasures
  );
  const confidence = Math.round((defined / 3) * 100);

  return {
    category: "technology_process",
    label: CATEGORY_LABELS.technology_process,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Document technology infrastructure, automate key processes, and implement basic security."
        : "Ensure all tech licenses are transferable and security practices are documented.",
  };
}

function scoreBuyerPreparation(input: SaleReadinessInput): CategoryResult {
  const scores = [
    boolScore(input.hasValuationReport),
    boolScore(input.hasListingOrTeaserDoc),
    boolScore(input.hasNdaTemplate),
    boolScore(input.hasIdentifiedBuyerProfiles),
  ];

  const missing: string[] = [];
  if (!input.hasValuationReport) missing.push("Business valuation report");
  if (!input.hasListingOrTeaserDoc) missing.push("Listing or teaser document");
  if (!input.hasNdaTemplate) missing.push("NDA template");
  if (!input.hasIdentifiedBuyerProfiles) missing.push("Identified buyer profiles");

  const score = avg(...scores);
  const defined = countDefined(
    input.hasValuationReport,
    input.hasListingOrTeaserDoc,
    input.hasNdaTemplate,
    input.hasIdentifiedBuyerProfiles
  );
  const confidence = Math.round((defined / 4) * 100);

  return {
    category: "buyer_preparation",
    label: CATEGORY_LABELS.buyer_preparation,
    score,
    confidence,
    freshness: confidence,
    missingEvidence: missing,
    riskLevel: riskLevelFromScore(score),
    recommendedAction:
      score < 50
        ? "Get a valuation, create a teaser document, and identify your target buyer type."
        : "Refine buyer profiles and prepare due diligence materials in advance.",
  };
}

// ─── Category weights (sum to 1.0) ────────────────────────────────────────────

const CATEGORY_WEIGHTS: Record<SaleReadinessCategory, number> = {
  financial_quality: 0.15,
  financial_documentation: 0.12,
  customer_diversification: 0.12,
  recurring_revenue: 0.10,
  owner_independence: 0.12,
  operational_transferability: 0.10,
  legal_org_records: 0.08,
  team_continuity: 0.08,
  technology_process: 0.07,
  buyer_preparation: 0.06,
};

// ─── Main scoring function ────────────────────────────────────────────────────

const DISCLAIMER =
  "This assessment is a structured self-evaluation tool and does not constitute a professional " +
  "appraisal, audit, legal opinion, certified financial analysis, or any guarantee of a " +
  "successful sale. Scores are based on information you have provided and may not reflect " +
  "all factors relevant to a buyer or market conditions. Consult qualified legal, financial, " +
  "and business advisors before making any sale-related decisions.";

export function computeSaleReadiness(
  input: SaleReadinessInput,
  previousScore: number | null = null
): SaleReadinessResult {
  const categoryFns: ((i: SaleReadinessInput) => CategoryResult)[] = [
    scoreFinancialQuality,
    scoreFinancialDocumentation,
    scoreCustomerDiversification,
    scoreRecurringRevenue,
    scoreOwnerIndependence,
    scoreOperationalTransferability,
    scoreLegalOrgRecords,
    scoreTeamContinuity,
    scoreTechnologyProcess,
    scoreBuyerPreparation,
  ];

  const categories = categoryFns.map((fn) => fn(input));

  // Weighted overall score
  const overallScore = Math.round(
    categories.reduce((sum, cat) => {
      return sum + cat.score * (CATEGORY_WEIGHTS[cat.category] ?? 0.1);
    }, 0)
  );

  // Find strongest and weakest
  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const strongestCategory = sorted[0].category;
  const weakestCategory = sorted[sorted.length - 1].category;

  const stage = readinessStageFromScore(overallScore);

  return {
    overallScore,
    stage,
    stageLabel: READINESS_STAGE_LABELS[stage],
    categories,
    strongestCategory,
    weakestCategory,
    deltaFromPrevious: previousScore !== null ? overallScore - previousScore : null,
    disclaimer: DISCLAIMER,
    scoredAt: new Date().toISOString(),
  };
}

// ─── 30/60/90-day action plan ────────────────────────────────────────────────

export type ActionPlanItem = {
  horizon: 30 | 60 | 90;
  category: SaleReadinessCategory;
  action: string;
  priority: "critical" | "high" | "medium";
};

/**
 * Returns a prioritized 30/60/90-day action plan based on the category scores.
 * Up to 3 items per horizon, sorted by risk level.
 */
export function buildActionPlan(result: SaleReadinessResult): ActionPlanItem[] {
  const critical = result.categories.filter((c) => c.riskLevel === "critical");
  const high = result.categories.filter((c) => c.riskLevel === "high");
  const medium = result.categories.filter((c) => c.riskLevel === "medium");

  const plan: ActionPlanItem[] = [];

  // 30-day: address critical items
  critical.slice(0, 3).forEach((cat) => {
    plan.push({
      horizon: 30,
      category: cat.category,
      action: cat.recommendedAction,
      priority: "critical",
    });
  });

  // 60-day: address high-risk items not already covered
  const remaining60 = high.slice(0, 3 - Math.min(critical.length, 3));
  remaining60.forEach((cat) => {
    plan.push({
      horizon: 60,
      category: cat.category,
      action: cat.recommendedAction,
      priority: "high",
    });
  });

  // 90-day: medium items
  medium.slice(0, 3).forEach((cat) => {
    plan.push({
      horizon: 90,
      category: cat.category,
      action: cat.recommendedAction,
      priority: "medium",
    });
  });

  return plan;
}

// ─── Readiness timeline estimate ─────────────────────────────────────────────

/**
 * Returns an estimated months-to-market based on the overall score.
 * This is a rough indicative estimate, not a guarantee.
 */
export function estimateTimelineMonths(overallScore: number): {
  minMonths: number;
  maxMonths: number;
  description: string;
} {
  if (overallScore >= 75) {
    return {
      minMonths: 1,
      maxMonths: 3,
      description: "Your business shows strong readiness. You could potentially list within 1–3 months.",
    };
  }
  if (overallScore >= 50) {
    return {
      minMonths: 3,
      maxMonths: 9,
      description: "With focused effort on key gaps, you could be market-ready in 3–9 months.",
    };
  }
  if (overallScore >= 25) {
    return {
      minMonths: 9,
      maxMonths: 18,
      description: "Significant preparation is needed. Plan for 9–18 months of readiness work.",
    };
  }
  return {
    minMonths: 18,
    maxMonths: 36,
    description: "Your business needs substantial groundwork. Expect 18–36 months to reach market readiness.",
  };
}
