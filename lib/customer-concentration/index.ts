/**
 * Customer Concentration Analysis Engine
 *
 * Pure, deterministic computation — no I/O.
 *
 * Implements a Herfindahl-Hirschman Index (HHI)-style concentration score
 * and revenue-share analysis.
 *
 * DISCLAIMER: This tool computes a concentration index for informational
 * purposes only. It is not a regulatory filing, antitrust assessment, or
 * certified financial analysis. The HHI is used here as a transparency
 * metric — it has no regulatory meaning in the context of small business sales.
 * Scenarios labeled "modeled estimates" are hypothetical and should not be
 * used as the sole basis for business decisions.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CustomerRecord = {
  id: string;
  /** Display name or alias (e.g. "Customer A" if anonymized). */
  name: string;
  /** Annual revenue attributed to this customer. */
  annualRevenue: number;
  isRecurring: boolean;
  hasActiveContract: boolean;
  contractExpiryMonths: number | null; // months until expiry; null = no contract
  isAtRisk: boolean; // user-flagged at-risk
  deletedAt?: string | null;
};

export type ConcentrationMetrics = {
  /** Normalized HHI (0–10 000 raw; 0–1 normalized). Explained plainly in plain language. */
  hhiRaw: number;
  hhiNormalized: number;
  hhiLabel: string;
  hhiExplanation: string;

  totalRevenue: number;
  customerCount: number;

  largestCustomerPct: number;
  top5Pct: number;
  top10Pct: number;

  atRiskRevenuePct: number;
  recurringRevenuePct: number;
  contractExpiryWithin12MonthsPct: number;

  rankedCustomers: RankedCustomer[];
  concentrationRiskLevel: "low" | "moderate" | "high" | "critical";
  retentionRiskSummary: string;
  concentrationAdjustedValuationImpact: string;
};

export type RankedCustomer = {
  rank: number;
  id: string;
  name: string;
  annualRevenue: number;
  revenuePct: number;
  isRecurring: boolean;
  hasActiveContract: boolean;
  contractExpiryMonths: number | null;
  isAtRisk: boolean;
};

// ─── Concentration computation ────────────────────────────────────────────────

function hhiLabel(hhiRaw: number): string {
  if (hhiRaw < 1500) return "Competitive (Low Concentration)";
  if (hhiRaw < 2500) return "Moderately Concentrated";
  return "Highly Concentrated";
}

function hhiExplanation(hhiRaw: number): string {
  return (
    `HHI score: ${hhiRaw.toFixed(0)} (scale 0–10 000). ` +
    "This measures how evenly revenue is spread across customers. " +
    "A lower score means no single customer dominates revenue. " +
    "This is a transparency metric — it has no regulatory meaning for small businesses."
  );
}

function concentrationRiskLevel(
  largestPct: number,
  top5Pct: number
): ConcentrationMetrics["concentrationRiskLevel"] {
  if (largestPct >= 50 || top5Pct >= 90) return "critical";
  if (largestPct >= 30 || top5Pct >= 70) return "high";
  if (largestPct >= 20 || top5Pct >= 50) return "moderate";
  return "low";
}

export function computeConcentrationMetrics(
  customers: CustomerRecord[]
): ConcentrationMetrics {
  const active = customers.filter((c) => !c.deletedAt);
  const totalRevenue = active.reduce((sum, c) => sum + c.annualRevenue, 0);

  if (active.length === 0 || totalRevenue === 0) {
    return {
      hhiRaw: 0,
      hhiNormalized: 0,
      hhiLabel: "No data",
      hhiExplanation: "No customer revenue data available.",
      totalRevenue: 0,
      customerCount: 0,
      largestCustomerPct: 0,
      top5Pct: 0,
      top10Pct: 0,
      atRiskRevenuePct: 0,
      recurringRevenuePct: 0,
      contractExpiryWithin12MonthsPct: 0,
      rankedCustomers: [],
      concentrationRiskLevel: "low",
      retentionRiskSummary: "No customer data available.",
      concentrationAdjustedValuationImpact:
        "No concentration data. Add customer revenue records to see impact.",
    };
  }

  // Rank customers
  const ranked = [...active]
    .sort((a, b) => b.annualRevenue - a.annualRevenue)
    .map((c, i) => ({
      rank: i + 1,
      id: c.id,
      name: c.name,
      annualRevenue: c.annualRevenue,
      revenuePct: (c.annualRevenue / totalRevenue) * 100,
      isRecurring: c.isRecurring,
      hasActiveContract: c.hasActiveContract,
      contractExpiryMonths: c.contractExpiryMonths,
      isAtRisk: c.isAtRisk,
    }));

  // HHI: sum of squares of market shares (as percentages)
  const hhiRaw = ranked.reduce((sum, c) => sum + c.revenuePct * c.revenuePct, 0);
  const hhiNormalized = hhiRaw / 10000;

  const top5Revenue = ranked.slice(0, 5).reduce((s, c) => s + c.annualRevenue, 0);
  const top10Revenue = ranked.slice(0, 10).reduce((s, c) => s + c.annualRevenue, 0);

  const atRiskRevenue = active
    .filter((c) => c.isAtRisk)
    .reduce((s, c) => s + c.annualRevenue, 0);
  const recurringRevenue = active
    .filter((c) => c.isRecurring)
    .reduce((s, c) => s + c.annualRevenue, 0);
  const expiringRevenue = active
    .filter((c) => c.contractExpiryMonths !== null && c.contractExpiryMonths <= 12)
    .reduce((s, c) => s + c.annualRevenue, 0);

  const largestPct = ranked[0]?.revenuePct ?? 0;
  const top5Pct = (top5Revenue / totalRevenue) * 100;
  const top10Pct = (top10Revenue / totalRevenue) * 100;
  const atRiskPct = (atRiskRevenue / totalRevenue) * 100;
  const recurringPct = (recurringRevenue / totalRevenue) * 100;
  const expiringPct = (expiringRevenue / totalRevenue) * 100;

  const riskLevel = concentrationRiskLevel(largestPct, top5Pct);

  const retentionRiskSummary =
    riskLevel === "critical"
      ? `Critical: ${largestPct.toFixed(1)}% of revenue from one customer. Loss of this customer would severely impact the business.`
      : riskLevel === "high"
      ? `High: Top customer accounts for ${largestPct.toFixed(1)}% of revenue. Diversification recommended.`
      : riskLevel === "moderate"
      ? `Moderate: Revenue is somewhat concentrated. Top 5 customers represent ${top5Pct.toFixed(1)}%.`
      : `Low: Revenue is well-diversified across customers.`;

  const concentrationAdjustedValuationImpact =
    riskLevel === "critical"
      ? "High concentration typically reduces buyer confidence and may lower valuation multiples significantly (estimated 20–40% discount on comparable deals — modeled estimate only)."
      : riskLevel === "high"
      ? "Elevated concentration may reduce buyer confidence. Buyers may apply a 10–20% discount for concentration risk (modeled estimate only)."
      : riskLevel === "moderate"
      ? "Some concentration risk. Minimal direct impact on valuation but buyers may request retention guarantees (modeled estimate only)."
      : "Low concentration is a positive factor for buyers and generally supports higher valuation multiples.";

  return {
    hhiRaw,
    hhiNormalized,
    hhiLabel: hhiLabel(hhiRaw),
    hhiExplanation: hhiExplanation(hhiRaw),
    totalRevenue,
    customerCount: active.length,
    largestCustomerPct: largestPct,
    top5Pct,
    top10Pct,
    atRiskRevenuePct: atRiskPct,
    recurringRevenuePct: recurringPct,
    contractExpiryWithin12MonthsPct: expiringPct,
    rankedCustomers: ranked,
    concentrationRiskLevel: riskLevel,
    retentionRiskSummary,
    concentrationAdjustedValuationImpact,
  };
}

// ─── Scenario modeling ───────────────────────────────────────────────────────

export type ScenarioType =
  | "lose_largest"
  | "lose_top3"
  | "reduce_largest_to_20pct"
  | "reduce_largest_to_15pct"
  | "add_diversified_source"
  | "extend_contracts";

export type ScenarioResult = {
  scenarioType: ScenarioType;
  label: string;
  disclaimer: string;
  resultingMetrics: ConcentrationMetrics;
  revenueImpactAmount: number;
  revenueImpactPct: number;
};

const SCENARIO_DISCLAIMER =
  "This is a modeled estimate for planning purposes only. It does not guarantee future revenue outcomes.";

export function modelScenario(
  customers: CustomerRecord[],
  scenarioType: ScenarioType
): ScenarioResult {
  const active = customers.filter((c) => !c.deletedAt);
  const sorted = [...active].sort((a, b) => b.annualRevenue - a.annualRevenue);
  const totalRevenue = active.reduce((s, c) => s + c.annualRevenue, 0);

  let modifiedCustomers: CustomerRecord[] = active;
  let label = "";
  let revenueImpactAmount = 0;

  switch (scenarioType) {
    case "lose_largest": {
      const largest = sorted[0];
      modifiedCustomers = active.filter((c) => c.id !== largest?.id);
      revenueImpactAmount = largest?.annualRevenue ?? 0;
      label = `Loss of largest customer (${largest?.name ?? "N/A"})`;
      break;
    }
    case "lose_top3": {
      const top3Ids = new Set(sorted.slice(0, 3).map((c) => c.id));
      modifiedCustomers = active.filter((c) => !top3Ids.has(c.id));
      revenueImpactAmount = sorted.slice(0, 3).reduce((s, c) => s + c.annualRevenue, 0);
      label = "Loss of top 3 customers";
      break;
    }
    case "reduce_largest_to_20pct": {
      const largest = sorted[0];
      if (!largest) {
        modifiedCustomers = active;
        label = "Reduce largest to 20% (no change)";
        break;
      }
      const target = totalRevenue * 0.2;
      revenueImpactAmount = Math.max(0, largest.annualRevenue - target);
      modifiedCustomers = active.map((c) =>
        c.id === largest.id ? { ...c, annualRevenue: target } : c
      );
      label = `Reduce ${largest.name} to 20% of revenue`;
      break;
    }
    case "reduce_largest_to_15pct": {
      const largest = sorted[0];
      if (!largest) {
        modifiedCustomers = active;
        label = "Reduce largest to 15% (no change)";
        break;
      }
      const target = totalRevenue * 0.15;
      revenueImpactAmount = Math.max(0, largest.annualRevenue - target);
      modifiedCustomers = active.map((c) =>
        c.id === largest.id ? { ...c, annualRevenue: target } : c
      );
      label = `Reduce ${largest.name} to 15% of revenue`;
      break;
    }
    case "add_diversified_source": {
      const addedRevenue = totalRevenue * 0.1; // model adding 10% new diversified revenue
      revenueImpactAmount = -addedRevenue; // negative = gain
      modifiedCustomers = [
        ...active,
        {
          id: "__scenario_new__",
          name: "New Diversified Source (modeled)",
          annualRevenue: addedRevenue,
          isRecurring: true,
          hasActiveContract: false,
          contractExpiryMonths: null,
          isAtRisk: false,
        },
      ];
      label = "Add 10% new diversified revenue source";
      break;
    }
    case "extend_contracts": {
      modifiedCustomers = active.map((c) =>
        c.contractExpiryMonths !== null && c.contractExpiryMonths <= 12
          ? { ...c, contractExpiryMonths: 24 }
          : c
      );
      label = "Extend expiring contracts to 24+ months";
      break;
    }
  }

  const resultingMetrics = computeConcentrationMetrics(modifiedCustomers);
  const revenueImpactPct =
    totalRevenue > 0 ? (revenueImpactAmount / totalRevenue) * 100 : 0;

  return {
    scenarioType,
    label,
    disclaimer: SCENARIO_DISCLAIMER,
    resultingMetrics,
    revenueImpactAmount,
    revenueImpactPct,
  };
}

// ─── CSV import validation ────────────────────────────────────────────────────

export type CsvImportRow = {
  name: string;
  annualRevenue: string;
  isRecurring?: string;
  hasActiveContract?: string;
  contractExpiryMonths?: string;
  isAtRisk?: string;
};

export type CsvValidationResult = {
  valid: CustomerRecord[];
  errors: { row: number; field: string; message: string }[];
};

function sanitizeCsvString(value: string): string {
  // Prevent spreadsheet formula injection
  const trimmed = value.trim();
  if (/^[=+\-@|]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function validateCsvImport(rows: CsvImportRow[]): CsvValidationResult {
  const valid: CustomerRecord[] = [];
  const errors: CsvValidationResult["errors"] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 1;
    const name = sanitizeCsvString(row.name ?? "");
    const revenueStr = (row.annualRevenue ?? "").trim().replace(/[,$]/g, "");
    const revenue = parseFloat(revenueStr);

    if (!name || name === "''") {
      errors.push({ row: rowNum, field: "name", message: "Customer name is required." });
      return;
    }
    if (isNaN(revenue) || revenue < 0) {
      errors.push({
        row: rowNum,
        field: "annualRevenue",
        message: "Annual revenue must be a non-negative number.",
      });
      return;
    }

    const expiryStr = (row.contractExpiryMonths ?? "").trim();
    const expiry = expiryStr ? parseInt(expiryStr, 10) : null;
    if (expiryStr && (isNaN(expiry!) || expiry! < 0)) {
      errors.push({
        row: rowNum,
        field: "contractExpiryMonths",
        message: "Contract expiry months must be a non-negative integer.",
      });
      return;
    }

    valid.push({
      id: `import_${rowNum}_${Date.now()}`,
      name,
      annualRevenue: revenue,
      isRecurring: ["true", "yes", "1"].includes((row.isRecurring ?? "").toLowerCase()),
      hasActiveContract: ["true", "yes", "1"].includes(
        (row.hasActiveContract ?? "").toLowerCase()
      ),
      contractExpiryMonths: expiry ?? null,
      isAtRisk: ["true", "yes", "1"].includes((row.isAtRisk ?? "").toLowerCase()),
    });
  });

  return { valid, errors };
}
