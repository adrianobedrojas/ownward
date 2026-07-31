/**
 * Valuation types and constants.
 *
 * DISCLAIMER: All values produced by this system are preliminary planning
 * estimates for educational purposes only. They are not certified appraisals,
 * fairness opinions, investment recommendations, or guaranteed sale prices.
 */

/** Increment this whenever the calculation logic changes in a material way. */
export const METHODOLOGY_VERSION = "1.0.0" as const;

export const VALUATION_STATUSES = ["draft", "calculated", "archived"] as const;
export type ValuationStatus = (typeof VALUATION_STATUSES)[number];

// ─────────────────────────────────────────────
// Industry configuration
// ─────────────────────────────────────────────

export const INDUSTRY_KEYS = [
  "services",
  "home-services",
  "food",
  "retail",
  "construction",
  "marketing",
  "technology",
  "other",
] as const;
export type IndustryKey = (typeof INDUSTRY_KEYS)[number];

/**
 * Preliminary planning multiples expressed as SDE (Seller's Discretionary
 * Earnings) multiples. These are configurable industry-planning assumptions
 * used in the absence of administratively managed benchmark records.
 *
 * Each range represents [defensiveLow, defensiveHigh, expectedLow,
 * expectedHigh, strategicLow, strategicHigh].
 *
 * Sources: commonly cited industry survey ranges (BizBuySell, IBBA, etc.).
 * Label these as preliminary planning assumptions to the user.
 */
export interface IndustryMultipleConfig {
  label: string;
  /** Defensive (pessimistic buyer) multiple range */
  defensiveRange: [number, number];
  /** Expected (neutral) multiple range */
  expectedRange: [number, number];
  /** Strategic (optimistic / strategic buyer) multiple range */
  strategicRange: [number, number];
}

export const INDUSTRY_MULTIPLES: Record<IndustryKey, IndustryMultipleConfig> =
  {
    services: {
      label: "Professional services",
      defensiveRange: [1.5, 2.0],
      expectedRange: [2.0, 3.0],
      strategicRange: [3.0, 4.5],
    },
    "home-services": {
      label: "Home services",
      defensiveRange: [1.5, 2.0],
      expectedRange: [2.0, 2.75],
      strategicRange: [2.75, 3.75],
    },
    food: {
      label: "Food and beverage",
      defensiveRange: [1.0, 1.5],
      expectedRange: [1.5, 2.5],
      strategicRange: [2.5, 3.5],
    },
    retail: {
      label: "Retail",
      defensiveRange: [1.0, 1.5],
      expectedRange: [1.5, 2.5],
      strategicRange: [2.5, 3.5],
    },
    construction: {
      label: "Construction",
      defensiveRange: [1.5, 2.0],
      expectedRange: [2.0, 2.75],
      strategicRange: [2.75, 4.0],
    },
    marketing: {
      label: "Marketing",
      defensiveRange: [1.5, 2.5],
      expectedRange: [2.5, 3.5],
      strategicRange: [3.5, 5.0],
    },
    technology: {
      label: "Technology",
      defensiveRange: [2.0, 3.0],
      expectedRange: [3.0, 5.0],
      strategicRange: [5.0, 8.0],
    },
    other: {
      label: "Other",
      defensiveRange: [1.5, 2.0],
      expectedRange: [2.0, 2.75],
      strategicRange: [2.75, 4.0],
    },
  };

// ─────────────────────────────────────────────
// Input types
// ─────────────────────────────────────────────

export interface FinancialYear {
  fiscalYear: number;
  revenue: number;
  cogs: number;
  operatingExpenses: number;
  ownerSalary: number;
  ownerBenefits: number;
  depreciation: number;
  amortization: number;
  interest: number;
  oneTimeExpenses: number;
  oneTimeRevenue: number;
}

export interface AddBack {
  label: string;
  amount: number;
  direction: "add" | "deduct";
  explanation: string;
}

export interface ValuationInput {
  businessProfile: {
    businessName: string;
    industry: IndustryKey;
    yearEstablished: number;
    currency: string;
  };
  financialYears: FinancialYear[]; // 1–3 entries, most recent last
  ownerEarnings: {
    ownerWeeklyHours: number;
    replacementManagerSalary: number;
    addBacks: AddBack[];
  };
  revenueQuality: {
    recurringRevenuePct: number;      // 0–100
    largestCustomerPct: number;       // 0–100
    top5CustomersPct: number;         // 0–100
    contractedRevenuePct: number;     // 0–100
    churnRatePct: number | null;      // 0–100 or null
  };
  operations: {
    hasDocumentedProcedures: boolean;
    hasKeyEmployees: boolean;
    keyEmployeeCount: number;
    hasSystemsAndTechnology: boolean;
    hasProprietaryIP: boolean;
  };
  assetsAndEvidence: {
    fairValueOfTangibleAssets: number;
    totalLiabilities: number;
    hasAuditedFinancials: boolean;
    hasTaxReturns: boolean;
    hasCustomerContracts: boolean;
    hasEmployeeAgreements: boolean;
  };
}

// ─────────────────────────────────────────────
// Output types
// ─────────────────────────────────────────────

export interface NormalizedEarningsRow {
  fiscalYear: number;
  revenue: number;
  grossProfit: number;
  operatingExpenses: number;
  reportedEarnings: number;
  totalAddBacks: number;
  totalDeductions: number;
  normalizedSDE: number;
  weight: number;
}

export interface AdjustmentDetail {
  label: string;
  direction: "add" | "deduct" | "multiple";
  amount: number;
  explanation: string;
}

export interface ValuationDriver {
  label: string;
  description: string;
  impact: "positive" | "negative" | "neutral";
}

export interface RiskFactor {
  label: string;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface MissingEvidence {
  label: string;
  whyItMatters: string;
}

export interface RecommendedAction {
  priority: "immediate" | "short-term" | "long-term";
  action: string;
  potentialImpact: string;
}

export interface BuyerInterpretation {
  buyerType: "owner-operator" | "financial" | "strategic";
  label: string;
  interpretation: string;
  likelyMultipleRange: [number, number];
  primaryConcerns: string[];
}

export interface ValueBridgeScenario {
  label: string;
  description: string;
  driver: string;
  deltaAmount: number;
  modeledValue: number;
  caveat: string;
}

export interface DnaScore {
  dimension: string;
  score: number; // 0–100
  label: string;
  explanation: string;
}

export interface ValuationResult {
  methodologyVersion: string;

  // Core outputs
  normalizedEarnings: number;
  weightedNormalizedEarnings: number;
  normalizedEarningsRows: NormalizedEarningsRow[];
  adjustments: AdjustmentDetail[];

  defensiveValue: number;
  expectedValue: number;
  strategicValue: number;
  defensiveMultiple: number;
  expectedMultiple: number;
  strategicMultiple: number;

  confidenceScore: number;
  confidenceFactors: { factor: string; score: number; weight: number }[];

  valueDrivers: ValuationDriver[];
  riskFactors: RiskFactor[];
  missingEvidence: MissingEvidence[];
  recommendedActions: RecommendedAction[];

  buyerInterpretations: BuyerInterpretation[];
  valueBridgeScenarios: ValueBridgeScenario[];
  dnaScores: DnaScore[];

  ownerDependenceNote: string;
  customerConcentrationNote: string;

  disclaimer: string;
  generatedAt: string; // ISO timestamp
}

// ─────────────────────────────────────────────
// Validation error type
// ─────────────────────────────────────────────
export interface ValuationValidationError {
  field: string;
  message: string;
}
