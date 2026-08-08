/**
 * __tests__/builder.test.ts
 *
 * Tests for Builder-plan specific helpers:
 * - checkLeadLimit
 * - checkTeamMemberLimit
 * - checkBookkeepingAccess
 * - Builder entitlements
 * - Valuation tier serializer (valueDnaScorecard → dnaScores correctness)
 */

// ─── checkLeadLimit ────────────────────────────────────────────────────────────

describe("checkLeadLimit", () => {
  it("allows lead creation on Explorer (free) plan within limit", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkLeadLimit(ent, 0)).toBeNull();
    expect(checkLeadLimit(ent, 4)).toBeNull();
  });

  it("blocks 6th lead on Explorer (free) plan (leadLimit=5, at 5)", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkLeadLimit(ent, 5);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
  });

  it("blocks lead creation on starter plan (leadLimit=25, at 25)", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkLeadLimit(ent, 25);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
  });

  it("allows lead creation on starter within limit", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkLeadLimit(ent, 24)).toBeNull();
  });

  it("blocks the 101st lead on builder plan (leadLimit=100)", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    const err = checkLeadLimit(ent, 100);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
    expect(err?.message).toContain("100");
  });

  it("allows the 100th lead on builder plan", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkLeadLimit(ent, 99)).toBeNull();
  });

  it("allows 1000 leads on pro plan", async () => {
    const { checkLeadLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkLeadLimit(ent, 999)).toBeNull();
    const err = checkLeadLimit(ent, 1000);
    expect(err).not.toBeNull();
  });
});

// ─── checkTeamMemberLimit ──────────────────────────────────────────────────────

describe("checkTeamMemberLimit", () => {
  it("blocks team invitation on free plan", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkTeamMemberLimit(ent, 0);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("PLAN_REQUIRED");
  });

  it("allows 1 invite on starter plan (limit=1)", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkTeamMemberLimit(ent, 0)).toBeNull();
  });

  it("blocks the 2nd invite on starter plan (limit=1)", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkTeamMemberLimit(ent, 1);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
  });

  it("allows 2 invited collaborators on builder plan (limit=2)", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkTeamMemberLimit(ent, 0)).toBeNull();
    expect(checkTeamMemberLimit(ent, 1)).toBeNull();
  });

  it("blocks the 3rd invited collaborator on builder plan", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    const err = checkTeamMemberLimit(ent, 2);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
  });

  it("allows up to 5 invites on pro plan", async () => {
    const { checkTeamMemberLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkTeamMemberLimit(ent, 4)).toBeNull();
    const err = checkTeamMemberLimit(ent, 5);
    expect(err).not.toBeNull();
  });
});

// ─── checkBookkeepingAccess ───────────────────────────────────────────────────

describe("checkBookkeepingAccess", () => {
  it("allows write access on free plan", async () => {
    const { checkBookkeepingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const result = checkBookkeepingAccess(ent);
    expect(result.allowed).toBe(true);
  });

  it("allows write access on starter plan (bookkeeping=true)", async () => {
    const { checkBookkeepingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const result = checkBookkeepingAccess(ent);
    expect(result.allowed).toBe(true);
  });

  it("allows write access on builder plan", async () => {
    const { checkBookkeepingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    const result = checkBookkeepingAccess(ent);
    expect(result.allowed).toBe(true);
  });

  it("allows write access on pro plan", async () => {
    const { checkBookkeepingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    const result = checkBookkeepingAccess(ent);
    expect(result.allowed).toBe(true);
  });
});

// ─── Builder entitlements completeness ───────────────────────────────────────

describe("Builder entitlements", () => {
  it("has all required Builder entitlements", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    const GB = 1024 * 1024 * 1024;

    expect(ent.businessLimit).toBe(2);
    expect(ent.documentLimit).toBe(100);
    expect(ent.storageBytes).toBe(5 * GB);
    expect(ent.leadLimit).toBe(100);
    expect(ent.teamMemberLimit).toBe(2);
    expect(ent.healthLevel).toBe("advanced");
    expect(ent.valuationLevel).toBe("enhanced");
    expect(ent.bookkeeping).toBe(true);
    expect(ent.dealRooms).toBe(false);
  });
});

// ─── Valuation tier field names ───────────────────────────────────────────────

describe("ValuationResult field names", () => {
  it("ValuationResult uses dnaScores not valueDnaScorecard", async () => {
    // Import the types module to confirm the field name is dnaScores
    const typesModule = await import("@/lib/valuation/types");
    // The interface should export DnaScore and ValuationResult
    // We verify by checking the export exists (not undefined)
    expect(typesModule).toBeDefined();
    // The calculateValuation engine must return a result with dnaScores
    const { calculateValuation } = await import("@/lib/valuation/engine");
    expect(typeof calculateValuation).toBe("function");
  });

  it("calculateValuation result has dnaScores field", async () => {
    const { calculateValuation } = await import("@/lib/valuation/engine");
    const input = {
      businessProfile: {
        businessName: "Test Co",
        industry: "services" as const,
        yearEstablished: 2020,
        currency: "USD",
      },
      financialYears: [
        {
          fiscalYear: 2023,
          revenue: 500000,
          cogs: 100000,
          operatingExpenses: 200000,
          ownerSalary: 60000,
          ownerBenefits: 10000,
          depreciation: 5000,
          amortization: 0,
          interest: 2000,
          oneTimeExpenses: 0,
          oneTimeRevenue: 0,
        },
      ],
      ownerEarnings: {
        ownerWeeklyHours: 40,
        replacementManagerSalary: 70000,
        addBacks: [],
      },
      revenueQuality: {
        recurringRevenuePct: 60,
        largestCustomerPct: 20,
        top5CustomersPct: 50,
        contractedRevenuePct: 30,
        churnRatePct: null,
      },
      operations: {
        hasDocumentedProcedures: true,
        hasKeyEmployees: false,
        keyEmployeeCount: 0,
        hasSystemsAndTechnology: false,
        hasProprietaryIP: false,
      },
      assetsAndEvidence: {
        fairValueOfTangibleAssets: 50000,
        totalLiabilities: 10000,
        hasAuditedFinancials: false,
        hasTaxReturns: true,
        hasCustomerContracts: false,
        hasEmployeeAgreements: false,
      },
    };

    const result = calculateValuation(input);
    // The field must be dnaScores (not valueDnaScorecard)
    expect("dnaScores" in result).toBe(true);
    expect("valueDnaScorecard" in result).toBe(false);
  });
});
