/**
 * Customer Concentration Engine Tests
 */

import {
  computeConcentrationMetrics,
  modelScenario,
  validateCsvImport,
  type CustomerRecord,
} from "@/lib/customer-concentration";

const CUSTOMERS: CustomerRecord[] = [
  { id: "1", name: "Alpha Corp", annualRevenue: 500000, isRecurring: true, hasActiveContract: true, contractExpiryMonths: 6, isAtRisk: false },
  { id: "2", name: "Beta LLC", annualRevenue: 200000, isRecurring: true, hasActiveContract: false, contractExpiryMonths: null, isAtRisk: false },
  { id: "3", name: "Gamma Inc", annualRevenue: 150000, isRecurring: false, hasActiveContract: false, contractExpiryMonths: null, isAtRisk: true },
  { id: "4", name: "Delta Co", annualRevenue: 100000, isRecurring: false, hasActiveContract: false, contractExpiryMonths: null, isAtRisk: false },
  { id: "5", name: "Epsilon Ltd", annualRevenue: 50000, isRecurring: false, hasActiveContract: false, contractExpiryMonths: null, isAtRisk: false },
];

const TOTAL_REVENUE = 500000 + 200000 + 150000 + 100000 + 50000; // 1_000_000

describe("computeConcentrationMetrics", () => {
  it("returns zero metrics for empty list", () => {
    const m = computeConcentrationMetrics([]);
    expect(m.totalRevenue).toBe(0);
    expect(m.customerCount).toBe(0);
    expect(m.hhiRaw).toBe(0);
    expect(m.concentrationRiskLevel).toBe("low");
  });

  it("computes total revenue correctly", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.totalRevenue).toBe(TOTAL_REVENUE);
  });

  it("ranks customers by revenue descending", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.rankedCustomers[0].name).toBe("Alpha Corp");
    expect(m.rankedCustomers[0].rank).toBe(1);
    expect(m.rankedCustomers[1].name).toBe("Beta LLC");
  });

  it("computes largest customer pct correctly", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.largestCustomerPct).toBeCloseTo(50, 1); // 500k / 1M = 50%
  });

  it("computes top5 pct as 100% with 5 customers", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.top5Pct).toBeCloseTo(100, 1);
  });

  it("returns critical risk for 50% single customer", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.concentrationRiskLevel).toBe("critical");
  });

  it("computes HHI > 0", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    expect(m.hhiRaw).toBeGreaterThan(0);
  });

  it("excludes soft-deleted customers", () => {
    const withDeleted: CustomerRecord[] = [
      ...CUSTOMERS,
      { id: "99", name: "Deleted Corp", annualRevenue: 999999, isRecurring: false, hasActiveContract: false, contractExpiryMonths: null, isAtRisk: false, deletedAt: "2024-01-01" },
    ];
    const m = computeConcentrationMetrics(withDeleted);
    expect(m.totalRevenue).toBe(TOTAL_REVENUE);
    expect(m.customerCount).toBe(5);
  });

  it("computes at-risk revenue pct", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    // Gamma Inc (150k) is at risk
    expect(m.atRiskRevenuePct).toBeCloseTo(15, 1);
  });

  it("computes recurring revenue pct", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    // Alpha (500k) + Beta (200k) = 700k / 1M = 70%
    expect(m.recurringRevenuePct).toBeCloseTo(70, 1);
  });

  it("computes contract expiry within 12 months", () => {
    const m = computeConcentrationMetrics(CUSTOMERS);
    // Alpha has contract expiring in 6 months = 500k / 1M = 50%
    expect(m.contractExpiryWithin12MonthsPct).toBeCloseTo(50, 1);
  });

  it("returns low risk for diversified customers", () => {
    const even: CustomerRecord[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      name: `Customer ${i}`,
      annualRevenue: 50000,
      isRecurring: false,
      hasActiveContract: false,
      contractExpiryMonths: null,
      isAtRisk: false,
    }));
    const m = computeConcentrationMetrics(even);
    expect(m.concentrationRiskLevel).toBe("low");
  });
});

describe("modelScenario", () => {
  it("lose_largest reduces total revenue by largest customer amount", () => {
    const result = modelScenario(CUSTOMERS, "lose_largest");
    expect(result.revenueImpactAmount).toBe(500000);
    expect(result.resultingMetrics.totalRevenue).toBe(TOTAL_REVENUE - 500000);
  });

  it("lose_top3 removes top 3 customers", () => {
    const result = modelScenario(CUSTOMERS, "lose_top3");
    // Top 3: Alpha (500k) + Beta (200k) + Gamma (150k) = 850k
    expect(result.revenueImpactAmount).toBe(850000);
    expect(result.resultingMetrics.totalRevenue).toBe(TOTAL_REVENUE - 850000);
  });

  it("reduce_largest_to_20pct reduces concentration compared to baseline", () => {
    const baseline = computeConcentrationMetrics(CUSTOMERS);
    const result = modelScenario(CUSTOMERS, "reduce_largest_to_20pct");
    // The largest customer's % should be lower than the baseline (50%)
    // Note: the reduction is to 20% of the original total; the resulting % of new total may be higher than 20%
    expect(result.resultingMetrics.largestCustomerPct).toBeLessThan(baseline.largestCustomerPct);
  });

  it("add_diversified_source increases customer count", () => {
    const result = modelScenario(CUSTOMERS, "add_diversified_source");
    expect(result.resultingMetrics.customerCount).toBeGreaterThan(CUSTOMERS.length);
    expect(result.revenueImpactAmount).toBeLessThan(0); // negative = added revenue
  });

  it("all scenarios include disclaimer", () => {
    const scenarios = ["lose_largest", "lose_top3", "reduce_largest_to_20pct", "add_diversified_source", "extend_contracts"] as const;
    for (const s of scenarios) {
      const r = modelScenario(CUSTOMERS, s);
      expect(r.disclaimer).toBeTruthy();
    }
  });
});

describe("validateCsvImport", () => {
  it("validates correct rows", () => {
    const { valid, errors } = validateCsvImport([
      { name: "Customer A", annualRevenue: "100000", isRecurring: "true" },
      { name: "Customer B", annualRevenue: "50000" },
    ]);
    expect(errors).toHaveLength(0);
    expect(valid).toHaveLength(2);
    expect(valid[0].annualRevenue).toBe(100000);
    expect(valid[0].isRecurring).toBe(true);
    expect(valid[1].isRecurring).toBe(false);
  });

  it("rejects rows with missing name", () => {
    const { errors } = validateCsvImport([{ name: "", annualRevenue: "1000" }]);
    expect(errors.some((e) => e.field === "name")).toBe(true);
  });

  it("rejects rows with invalid revenue", () => {
    const { errors } = validateCsvImport([{ name: "X", annualRevenue: "abc" }]);
    expect(errors.some((e) => e.field === "annualRevenue")).toBe(true);
  });

  it("rejects negative revenue", () => {
    const { errors } = validateCsvImport([{ name: "X", annualRevenue: "-100" }]);
    expect(errors.some((e) => e.field === "annualRevenue")).toBe(true);
  });

  it("sanitizes formula injection in names", () => {
    const { valid } = validateCsvImport([{ name: "=SUM(A1:A10)", annualRevenue: "1000" }]);
    expect(valid[0].name).toMatch(/^'/);
  });

  it("handles currency-formatted revenue (commas and $)", () => {
    const { valid } = validateCsvImport([{ name: "Corp", annualRevenue: "$1,000,000" }]);
    expect(valid[0].annualRevenue).toBe(1000000);
  });
});
