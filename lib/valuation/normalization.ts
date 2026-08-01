/**
 * Input normalization and validation for the valuation engine.
 * All functions are pure and free of side-effects so they can be unit-tested
 * without a database or HTTP connection.
 */

import {
  INDUSTRY_KEYS,
  type FinancialYear,
  type ValuationInput,
  type ValuationValidationError,
} from "./types";

// ─────────────────────────────────────────────
// Primitive guards
// ─────────────────────────────────────────────

/** Returns true for a finite, non-negative number (NaN and Infinity are rejected). */
export function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Returns true for a finite number in [0, 100]. */
export function isPercentage(value: unknown): value is number {
  return isFiniteNonNegative(value) && (value as number) <= 100;
}

/** Clamps a number to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Safely coerce an unknown value to a finite non-negative number. */
export function toFiniteNonNegative(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// ─────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────

export function validateValuationInput(
  input: unknown
): ValuationValidationError[] {
  const errors: ValuationValidationError[] = [];

  if (!input || typeof input !== "object") {
    errors.push({ field: "root", message: "Invalid input structure." });
    return errors;
  }

  const inp = input as Partial<ValuationInput>;

  // ── Business profile ──────────────────────
  const profile = inp.businessProfile;
  if (!profile) {
    errors.push({ field: "businessProfile", message: "Business profile is required." });
  } else {
    if (!profile.businessName || typeof profile.businessName !== "string" || profile.businessName.trim().length === 0) {
      errors.push({ field: "businessProfile.businessName", message: "Business name is required." });
    }
    if (!INDUSTRY_KEYS.includes(profile.industry as never)) {
      errors.push({ field: "businessProfile.industry", message: "A valid industry is required." });
    }
    if (
      !Number.isInteger(profile.yearEstablished) ||
      profile.yearEstablished < 1800 ||
      profile.yearEstablished > new Date().getFullYear()
    ) {
      errors.push({ field: "businessProfile.yearEstablished", message: "Year established must be a valid past year." });
    }
    if (!profile.currency || typeof profile.currency !== "string") {
      errors.push({ field: "businessProfile.currency", message: "Currency is required." });
    }
  }

  // ── Financial years ───────────────────────
  const years = inp.financialYears;
  if (!Array.isArray(years) || years.length === 0) {
    errors.push({ field: "financialYears", message: "At least one year of financial data is required." });
  } else if (years.length > 3) {
    errors.push({ field: "financialYears", message: "Provide at most three years of financial data." });
  } else {
    const numericFields: (keyof FinancialYear)[] = [
      "revenue",
      "cogs",
      "operatingExpenses",
      "ownerSalary",
      "ownerBenefits",
      "depreciation",
      "amortization",
      "interest",
      "oneTimeExpenses",
      "oneTimeRevenue",
    ];

    years.forEach((yr, i) => {
      if (!Number.isInteger(yr.fiscalYear) || yr.fiscalYear < 1800) {
        errors.push({ field: `financialYears[${i}].fiscalYear`, message: "A valid fiscal year is required." });
      }
      for (const field of numericFields) {
        if (!isFiniteNonNegative(yr[field])) {
          errors.push({
            field: `financialYears[${i}].${field}`,
            message: `${field} must be a finite, non-negative number.`,
          });
        }
      }
      if (isFiniteNonNegative(yr.revenue) && isFiniteNonNegative(yr.cogs) && yr.cogs > yr.revenue) {
        errors.push({
          field: `financialYears[${i}].cogs`,
          message: "Cost of goods sold cannot exceed revenue.",
        });
      }
    });
  }

  // ── Owner earnings ────────────────────────
  const oe = inp.ownerEarnings;
  if (!oe) {
    errors.push({ field: "ownerEarnings", message: "Owner earnings data is required." });
  } else {
    if (!isFiniteNonNegative(oe.ownerWeeklyHours) || oe.ownerWeeklyHours > 168) {
      errors.push({ field: "ownerEarnings.ownerWeeklyHours", message: "Owner weekly hours must be between 0 and 168." });
    }
    if (!isFiniteNonNegative(oe.replacementManagerSalary)) {
      errors.push({ field: "ownerEarnings.replacementManagerSalary", message: "Replacement manager salary must be a non-negative number." });
    }
    if (!Array.isArray(oe.addBacks)) {
      errors.push({ field: "ownerEarnings.addBacks", message: "Add-backs must be an array." });
    } else {
      oe.addBacks.forEach((ab, i) => {
        if (!ab.label || typeof ab.label !== "string" || ab.label.trim().length === 0) {
          errors.push({ field: `ownerEarnings.addBacks[${i}].label`, message: "Add-back label is required." });
        }
        if (!isFiniteNonNegative(ab.amount)) {
          errors.push({ field: `ownerEarnings.addBacks[${i}].amount`, message: "Add-back amount must be a non-negative number." });
        }
        if (ab.direction !== "add" && ab.direction !== "deduct") {
          errors.push({ field: `ownerEarnings.addBacks[${i}].direction`, message: 'Direction must be "add" or "deduct".' });
        }
      });
    }
  }

  // ── Revenue quality ───────────────────────
  const rq = inp.revenueQuality;
  if (!rq) {
    errors.push({ field: "revenueQuality", message: "Revenue quality data is required." });
  } else {
    const pctFields: (keyof typeof rq)[] = [
      "recurringRevenuePct",
      "largestCustomerPct",
      "top5CustomersPct",
      "contractedRevenuePct",
    ];
    for (const f of pctFields) {
      if (!isPercentage(rq[f])) {
        errors.push({ field: `revenueQuality.${f}`, message: `${f} must be a percentage between 0 and 100.` });
      }
    }
    if (rq.churnRatePct !== null && rq.churnRatePct !== undefined && !isPercentage(rq.churnRatePct)) {
      errors.push({ field: "revenueQuality.churnRatePct", message: "Churn rate must be null or a percentage between 0 and 100." });
    }
    if (
      isPercentage(rq.largestCustomerPct) &&
      isPercentage(rq.top5CustomersPct) &&
      rq.largestCustomerPct > rq.top5CustomersPct + 0.01
    ) {
      errors.push({ field: "revenueQuality.largestCustomerPct", message: "Largest customer percentage cannot exceed top-5 percentage." });
    }
  }

  // ── Operations ────────────────────────────
  const ops = inp.operations;
  if (!ops) {
    errors.push({ field: "operations", message: "Operations data is required." });
  } else {
    if (typeof ops.hasDocumentedProcedures !== "boolean") {
      errors.push({ field: "operations.hasDocumentedProcedures", message: "hasDocumentedProcedures must be true or false." });
    }
    if (typeof ops.hasKeyEmployees !== "boolean") {
      errors.push({ field: "operations.hasKeyEmployees", message: "hasKeyEmployees must be true or false." });
    }
    if (!Number.isInteger(ops.keyEmployeeCount) || ops.keyEmployeeCount < 0) {
      errors.push({ field: "operations.keyEmployeeCount", message: "Key employee count must be a non-negative integer." });
    }
    if (typeof ops.hasSystemsAndTechnology !== "boolean") {
      errors.push({ field: "operations.hasSystemsAndTechnology", message: "hasSystemsAndTechnology must be true or false." });
    }
    if (typeof ops.hasProprietaryIP !== "boolean") {
      errors.push({ field: "operations.hasProprietaryIP", message: "hasProprietaryIP must be true or false." });
    }
  }

  // ── Assets and evidence ───────────────────
  const ae = inp.assetsAndEvidence;
  if (!ae) {
    errors.push({ field: "assetsAndEvidence", message: "Assets and evidence data is required." });
  } else {
    if (!isFiniteNonNegative(ae.fairValueOfTangibleAssets)) {
      errors.push({ field: "assetsAndEvidence.fairValueOfTangibleAssets", message: "Fair value of tangible assets must be a non-negative number." });
    }
    if (!isFiniteNonNegative(ae.totalLiabilities)) {
      errors.push({ field: "assetsAndEvidence.totalLiabilities", message: "Total liabilities must be a non-negative number." });
    }
    const boolFields = [
      "hasAuditedFinancials",
      "hasTaxReturns",
      "hasCustomerContracts",
      "hasEmployeeAgreements",
    ] as const;
    for (const f of boolFields) {
      if (typeof ae[f] !== "boolean") {
        errors.push({ field: `assetsAndEvidence.${f}`, message: `${f} must be true or false.` });
      }
    }
  }

  return errors;
}

// ─────────────────────────────────────────────
// Data normalization helpers
// ─────────────────────────────────────────────

/**
 * Assign weights to financial years.
 * Most recent year gets the highest weight.
 * years must be sorted oldest-first.
 */
export function yearWeights(count: number): number[] {
  if (count === 1) return [1];
  if (count === 2) return [0.35, 0.65];
  return [0.2, 0.35, 0.45];
}

/**
 * Round to the nearest dollar for display.
 */
export function roundToDollar(value: number): number {
  return Math.round(value);
}

/**
 * Calculate gross profit for a single year.
 */
export function calcGrossProfit(yr: FinancialYear): number {
  return yr.revenue - yr.cogs;
}

/**
 * Calculate reported earnings (before owner add-backs) for a single year.
 * Reported earnings ≈ Revenue − COGS − Operating Expenses
 * (Owner salary is already included in operating expenses by convention.)
 */
export function calcReportedEarnings(yr: FinancialYear): number {
  return yr.revenue - yr.cogs - yr.operatingExpenses;
}

/**
 * Calculate the SDE for a single year.
 * SDE = Reported Earnings
 *       + Owner Salary
 *       + Owner Benefits
 *       + Depreciation & Amortization
 *       + Interest
 *       + One-time Expenses
 *       − One-time Revenue
 *       + User-defined Add-backs
 *       − User-defined Deductions
 *
 * We do NOT add the replacement manager salary here — it is deducted
 * separately as a risk adjustment on the multiple.
 */
export function calcYearSDE(
  yr: FinancialYear,
  addBacks: { amount: number; direction: "add" | "deduct" }[]
): number {
  const base =
    calcReportedEarnings(yr) +
    yr.ownerSalary +
    yr.ownerBenefits +
    yr.depreciation +
    yr.amortization +
    yr.interest +
    yr.oneTimeExpenses -
    yr.oneTimeRevenue;

  const addBackTotal = addBacks.reduce((acc, ab) => {
    return ab.direction === "add" ? acc + ab.amount : acc - ab.amount;
  }, 0);

  return base + addBackTotal;
}
