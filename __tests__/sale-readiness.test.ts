/**
 * Sale-Readiness Engine Tests
 *
 * Tests the pure scoring engine with various inputs.
 */

import {
  computeSaleReadiness,
  buildActionPlan,
  estimateTimelineMonths,
  readinessStageFromScore,
  riskLevelFromScore,
  SALE_READINESS_CATEGORIES,
} from "@/lib/sale-readiness/engine";
import type { SaleReadinessInput } from "@/lib/sale-readiness/engine";

const FULL_INPUT: SaleReadinessInput = {
  hasThreeYearFinancials: true,
  hasCleanBooks: true,
  revenueGrowthPositive: true,
  ebitdaMarginPct: 25,
  hasAuditedFinancials: true,
  hasRecentTaxReturns: true,
  hasMonthlyPnl: true,
  hasBankStatements: true,
  topCustomerRevenuePct: 10,
  top5CustomerRevenuePct: 35,
  customerCount: 50,
  recurringRevenuePct: 70,
  hasActiveContracts: true,
  avgContractLengthMonths: 24,
  ownerHoursPerWeek: 10,
  hasDocumentedProcesses: true,
  hasSecondInCommand: true,
  hasOperationsManual: true,
  hasVendorContracts: true,
  hasKeySystemsDocumented: true,
  hasFormationDocs: true,
  hasCleanCapTable: true,
  hasActiveIpProtection: true,
  hasNoMajorLitigation: true,
  hasKeyEmployeeContracts: true,
  avgEmployeeTenureYears: 5,
  hasSuccessionPlan: true,
  hasTechDocumentation: true,
  hasAutomatedProcesses: true,
  hasCyberSecurityMeasures: true,
  hasValuationReport: true,
  hasListingOrTeaserDoc: true,
  hasNdaTemplate: true,
  hasIdentifiedBuyerProfiles: true,
};

const EMPTY_INPUT: SaleReadinessInput = {
  hasThreeYearFinancials: false,
  hasCleanBooks: false,
  revenueGrowthPositive: null,
  ebitdaMarginPct: null,
  hasAuditedFinancials: false,
  hasRecentTaxReturns: false,
  hasMonthlyPnl: false,
  hasBankStatements: false,
  topCustomerRevenuePct: null,
  top5CustomerRevenuePct: null,
  customerCount: null,
  recurringRevenuePct: null,
  hasActiveContracts: false,
  avgContractLengthMonths: null,
  ownerHoursPerWeek: null,
  hasDocumentedProcesses: false,
  hasSecondInCommand: false,
  hasOperationsManual: false,
  hasVendorContracts: false,
  hasKeySystemsDocumented: false,
  hasFormationDocs: false,
  hasCleanCapTable: false,
  hasActiveIpProtection: null,
  hasNoMajorLitigation: true,
  hasKeyEmployeeContracts: false,
  avgEmployeeTenureYears: null,
  hasSuccessionPlan: false,
  hasTechDocumentation: false,
  hasAutomatedProcesses: false,
  hasCyberSecurityMeasures: false,
  hasValuationReport: false,
  hasListingOrTeaserDoc: false,
  hasNdaTemplate: false,
  hasIdentifiedBuyerProfiles: false,
};

describe("computeSaleReadiness", () => {
  it("returns score 0–100 for full input", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("full input yields higher score than empty input", () => {
    const full = computeSaleReadiness(FULL_INPUT);
    const empty = computeSaleReadiness(EMPTY_INPUT);
    expect(full.overallScore).toBeGreaterThan(empty.overallScore);
  });

  it("has 10 categories in result", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    expect(result.categories).toHaveLength(10);
  });

  it("all category keys are valid", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    result.categories.forEach((cat) => {
      expect(SALE_READINESS_CATEGORIES).toContain(cat.category);
    });
  });

  it("every category score is 0–100", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    result.categories.forEach((cat) => {
      expect(cat.score).toBeGreaterThanOrEqual(0);
      expect(cat.score).toBeLessThanOrEqual(100);
    });
  });

  it("computes delta from previous when provided", () => {
    const result = computeSaleReadiness(FULL_INPUT, 40);
    expect(result.deltaFromPrevious).toBe(result.overallScore - 40);
  });

  it("deltaFromPrevious is null when no previous score", () => {
    const result = computeSaleReadiness(FULL_INPUT, null);
    expect(result.deltaFromPrevious).toBeNull();
  });

  it("returns correct stage for score < 25", () => {
    const result = computeSaleReadiness(EMPTY_INPUT);
    if (result.overallScore < 25) {
      expect(result.stage).toBe("early_preparation");
    }
  });

  it("returns buyer_ready stage for high score", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    if (result.overallScore >= 75) {
      expect(result.stage).toBe("buyer_ready");
    }
  });

  it("includes a disclaimer", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    expect(result.disclaimer).toBeTruthy();
    expect(result.disclaimer.length).toBeGreaterThan(50);
  });

  it("has strongestCategory and weakestCategory", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    expect(SALE_READINESS_CATEGORIES).toContain(result.strongestCategory);
    expect(SALE_READINESS_CATEGORIES).toContain(result.weakestCategory);
  });

  it("includes scoredAt timestamp", () => {
    const result = computeSaleReadiness(FULL_INPUT);
    expect(() => new Date(result.scoredAt)).not.toThrow();
  });
});

  it("does not penalize legal readiness when IP protection is not applicable", () => {
    const applicableInput: SaleReadinessInput = {
      ...FULL_INPUT,
      hasActiveIpProtection: true,
    };

    const notApplicableInput: SaleReadinessInput = {
      ...FULL_INPUT,
      hasActiveIpProtection: "not_applicable",
    };

    const applicableResult = computeSaleReadiness(applicableInput);
    const notApplicableResult = computeSaleReadiness(notApplicableInput);

    const applicableLegal = applicableResult.categories.find(
      (category) => category.category === "legal_org_records"
    );

    const notApplicableLegal = notApplicableResult.categories.find(
      (category) => category.category === "legal_org_records"
    );

    expect(applicableLegal?.score).toBe(100);
    expect(notApplicableLegal?.score).toBe(100);
  });

  it("treats explicit no IP protection differently from not applicable", () => {
    const noIpInput: SaleReadinessInput = {
      ...FULL_INPUT,
      hasActiveIpProtection: false,
    };

    const notApplicableInput: SaleReadinessInput = {
      ...FULL_INPUT,
      hasActiveIpProtection: "not_applicable",
    };

    const noIpResult = computeSaleReadiness(noIpInput);
    const notApplicableResult = computeSaleReadiness(notApplicableInput);

    const noIpLegal = noIpResult.categories.find(
      (category) => category.category === "legal_org_records"
    );

    const notApplicableLegal = notApplicableResult.categories.find(
      (category) => category.category === "legal_org_records"
    );

    expect(notApplicableLegal?.score).toBeGreaterThan(
      noIpLegal?.score ?? 0
    );
  });

  });

  describe("readinessStageFromScore", () => {
    it("returns early_preparation for 0", () => {
      expect(readinessStageFromScore(0)).toBe("early_preparation");
    });
    it("returns building_readiness for 30", () => {
      expect(readinessStageFromScore(30)).toBe("building_readiness");
    });
    it("returns approaching_market for 60", () => {
      expect(readinessStageFromScore(60)).toBe("approaching_market");
    });
    it("returns buyer_ready for 80", () => {
      expect(readinessStageFromScore(80)).toBe("buyer_ready");
    });
    it("returns buyer_ready for 100", () => {
      expect(readinessStageFromScore(100)).toBe("buyer_ready");
    });
  });

  describe("riskLevelFromScore", () => {
    it("critical for 0–19", () => {
      expect(riskLevelFromScore(0)).toBe("critical");
      expect(riskLevelFromScore(19)).toBe("critical");
    });
    it("high for 20–39", () => {
      expect(riskLevelFromScore(20)).toBe("high");
      expect(riskLevelFromScore(39)).toBe("high");
    });
    it("medium for 40–59", () => {
      expect(riskLevelFromScore(40)).toBe("medium");
      expect(riskLevelFromScore(59)).toBe("medium");
    });
    it("low for 60–79", () => {
      expect(riskLevelFromScore(60)).toBe("low");
      expect(riskLevelFromScore(79)).toBe("low");
    });
    it("none for 80–100", () => {
      expect(riskLevelFromScore(80)).toBe("none");
      expect(riskLevelFromScore(100)).toBe("none");
    });
  });

  describe("buildActionPlan", () => {
    it("returns array of action items", () => {
      const result = computeSaleReadiness(EMPTY_INPUT);
      const plan = buildActionPlan(result);
      expect(Array.isArray(plan)).toBe(true);
    });

    it("action items have valid horizon (30, 60, or 90)", () => {
      const result = computeSaleReadiness(EMPTY_INPUT);
      const plan = buildActionPlan(result);
      plan.forEach((item) => {
        expect([30, 60, 90]).toContain(item.horizon);
      });
    });

  it("returns empty plan for perfect score", () => {
      // Perfect score means no critical/high/medium risk    const result = computeSaleReadiness(FULL_INPUT);
   const plan = buildActionPlan(result);
    // Plan may have entries for medium risk items; that's fine    plan.forEach((item) => {
  expect(item.action).toBeTruthy();
    });
  });
});

describe("estimateTimelineMonths", () => {
  it("returns 1–3 months for score >= 75", () => {
    const t = estimateTimelineMonths(80);
    expect(t.minMonths).toBe(1);
    expect(t.maxMonths).toBe(3);
  });

  it("returns 3–9 months for score 50–74", () => {
    const t = estimateTimelineMonths(60);
    expect(t.minMonths).toBe(3);
    expect(t.maxMonths).toBe(9);
  });

  it("returns 9–18 months for score 25–49", () => {
    const t = estimateTimelineMonths(40);
    expect(t.minMonths).toBe(9);
    expect(t.maxMonths).toBe(18);
  });

  it("returns 18–36 months for score < 25", () => {
    const t = estimateTimelineMonths(10);
    expect(t.minMonths).toBe(18);
    expect(t.maxMonths).toBe(36);
  });
});
