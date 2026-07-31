/**
 * Weekly Valuation Pulse — Refresh eligibility and metadata.
 *
 * One official refreshed snapshot per rolling 7 days per Pro business.
 * Drafts may be created anytime.
 * Immutable versions — existing reports are never overwritten.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ValuationRefreshEligibility =
  | { eligible: true; nextRefreshAt: null }
  | {
      eligible: false;
      nextRefreshAt: string; // ISO timestamp when next refresh is allowed
      hoursRemaining: number;
    };

export type ValuationChangeDriverKey =
  | "revenue"
  | "ebitda_margin"
  | "customer_concentration"
  | "owner_dependence"
  | "recurring_revenue"
  | "evidence_quality"
  | "market_multiple"
  | "normalized_earnings";

export const DRIVER_LABELS: Record<ValuationChangeDriverKey, string> = {
  revenue: "Revenue",
  ebitda_margin: "EBITDA Margin",
  customer_concentration: "Customer Concentration",
  owner_dependence: "Owner Dependence",
  recurring_revenue: "Recurring Revenue",
  evidence_quality: "Evidence Quality",
  market_multiple: "Market Multiple",
  normalized_earnings: "Normalized Earnings",
};

export type ValuationChangeDriver = {
  key: ValuationChangeDriverKey;
  label: string;
  previousValue: number | null;
  currentValue: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  explanation: string;
};

export type ValuationRefreshMetadata = {
  businessId: string;
  refreshedFromReportId: string | null;
  refreshPeriodStart: string; // ISO date
  nextRefreshAt: string; // ISO timestamp (refreshPeriodStart + 7 days)
  valuationChangeAmount: number | null;
  valuationChangePercent: number | null;
  changeDrivers: ValuationChangeDriver[];
};

// ─── Refresh eligibility ─────────────────────────────────────────────────────

const REFRESH_WINDOW_DAYS = 7;

/**
 * Determines whether a Pro business is eligible for an official valuation refresh.
 *
 * @param lastOfficialRefreshAt ISO timestamp of the last official refresh, or null if none.
 * @param nowOverride Optional timestamp override for testing.
 */
export function checkValuationRefreshEligibility(
  lastOfficialRefreshAt: string | null,
  nowOverride?: Date
): ValuationRefreshEligibility {
  const now = nowOverride ?? new Date();

  if (lastOfficialRefreshAt === null) {
    return { eligible: true, nextRefreshAt: null };
  }

  const lastRefresh = new Date(lastOfficialRefreshAt);
  const nextRefresh = new Date(
    lastRefresh.getTime() + REFRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  if (now >= nextRefresh) {
    return { eligible: true, nextRefreshAt: null };
  }

  const msRemaining = nextRefresh.getTime() - now.getTime();
  const hoursRemaining = Math.ceil(msRemaining / (1000 * 60 * 60));

  return {
    eligible: false,
    nextRefreshAt: nextRefresh.toISOString(),
    hoursRemaining,
  };
}

// ─── Change driver computation ────────────────────────────────────────────────

type PreviousAndCurrent = {
  previous: number | null;
  current: number | null;
};

function buildDriver(
  key: ValuationChangeDriverKey,
  values: PreviousAndCurrent
): ValuationChangeDriver {
  const { previous, current } = values;
  const changeAmount =
    previous !== null && current !== null ? current - previous : null;
  const changePercent =
    previous !== null && current !== null && previous !== 0
      ? ((current - previous) / Math.abs(previous)) * 100
      : null;

  const label = DRIVER_LABELS[key];
  let explanation = `${label}: `;

  if (previous === null || current === null) {
    explanation += "Insufficient data to compute change.";
  } else if (changeAmount === 0) {
    explanation += "No change from previous period.";
  } else {
    const direction = changeAmount! > 0 ? "increased" : "decreased";
    explanation += `${direction} from ${previous.toFixed(2)} to ${current.toFixed(2)}`;
    if (changePercent !== null) {
      explanation += ` (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`;
    }
    explanation += ".";
  }

  return {
    key,
    label,
    previousValue: previous,
    currentValue: current,
    changeAmount,
    changePercent,
    explanation,
  };
}

export type ValuationDriverInputs = {
  revenue?: PreviousAndCurrent;
  ebitdaMargin?: PreviousAndCurrent;
  customerConcentration?: PreviousAndCurrent;
  ownerDependence?: PreviousAndCurrent;
  recurringRevenue?: PreviousAndCurrent;
  evidenceQuality?: PreviousAndCurrent;
  marketMultiple?: PreviousAndCurrent;
  normalizedEarnings?: PreviousAndCurrent;
};

/**
 * Computes the change drivers between two valuation snapshots.
 * Returns only drivers where data is available for at least one period.
 */
export function computeChangeDrivers(
  inputs: ValuationDriverInputs
): ValuationChangeDriver[] {
  const drivers: ValuationChangeDriver[] = [];

  const mapping: [ValuationChangeDriverKey, PreviousAndCurrent | undefined][] = [
    ["revenue", inputs.revenue],
    ["ebitda_margin", inputs.ebitdaMargin],
    ["customer_concentration", inputs.customerConcentration],
    ["owner_dependence", inputs.ownerDependence],
    ["recurring_revenue", inputs.recurringRevenue],
    ["evidence_quality", inputs.evidenceQuality],
    ["market_multiple", inputs.marketMultiple],
    ["normalized_earnings", inputs.normalizedEarnings],
  ];

  for (const [key, values] of mapping) {
    if (values && (values.previous !== null || values.current !== null)) {
      drivers.push(buildDriver(key, values));
    }
  }

  return drivers;
}

// ─── Valuation change summary ─────────────────────────────────────────────────

export type ValuationChangeSummary = {
  previousValuation: number | null;
  currentValuation: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  summary: string;
  drivers: ValuationChangeDriver[];
};

export function buildValuationChangeSummary(
  previousValuation: number | null,
  currentValuation: number | null,
  drivers: ValuationChangeDriver[]
): ValuationChangeSummary {
  const changeAmount =
    previousValuation !== null && currentValuation !== null
      ? currentValuation - previousValuation
      : null;
  const changePercent =
    previousValuation !== null &&
    currentValuation !== null &&
    previousValuation !== 0
      ? ((currentValuation - previousValuation) / Math.abs(previousValuation)) * 100
      : null;

  let direction: ValuationChangeSummary["direction"] = "unknown";
  if (changeAmount !== null) {
    if (changeAmount > 0) direction = "up";
    else if (changeAmount < 0) direction = "down";
    else direction = "flat";
  }

  let summary = "";
  if (direction === "unknown") {
    summary = "Insufficient data to compare valuations.";
  } else if (direction === "flat") {
    summary = "Valuation is unchanged from the previous refresh.";
  } else {
    const fmt = (n: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    summary = `Valuation ${direction === "up" ? "increased" : "decreased"} by ${fmt(Math.abs(changeAmount!))}`;
    if (changePercent !== null) {
      summary += ` (${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%)`;
    }
    summary += " since the previous refresh.";
  }

  return {
    previousValuation,
    currentValuation,
    changeAmount,
    changePercent,
    direction,
    summary,
    drivers,
  };
}
