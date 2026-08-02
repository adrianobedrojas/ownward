/**
 * Billing & Entitlement Tests
 *
 * Tests the entitlement model, billing state, and limit helpers.
 * No Supabase or Stripe connections required.
 */

// ─── Entitlement model ────────────────────────────────────────────────────────

describe("getEntitlementsByPlan", () => {
  it("returns zero/false for free plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(ent.businessLimit).toBe(0);
    expect(ent.listingLimit).toBe(0);
    expect(ent.documentLimit).toBe(0);
    expect(ent.storageBytes).toBe(0);
    expect(ent.milestoneMonthlyLimit).toBe(0);
    expect(ent.bookkeeping).toBe(false);
    expect(ent.dealRooms).toBe(false);
    expect(ent.healthLevel).toBe("none");
    expect(ent.valuationLevel).toBe("preview");
    expect(ent.supportLevel).toBe("general");
  });

  it("returns correct values for starter plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(ent.businessLimit).toBe(1);
    expect(ent.listingLimit).toBe(1);
    expect(ent.documentLimit).toBe(10);
    expect(ent.storageBytes).toBe(500 * 1024 * 1024); // 500 MB
    expect(ent.milestoneMonthlyLimit).toBe(10);
    expect(ent.bookkeeping).toBe(true);
    expect(ent.dealRooms).toBe(false);
    expect(ent.healthLevel).toBe("basic");
    expect(ent.valuationLevel).toBe("basic");
    expect(ent.supportLevel).toBe("standard");
  });

  it("returns correct values for builder plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(ent.businessLimit).toBe(2);
    expect(ent.healthLevel).toBe("advanced");
    expect(ent.valuationLevel).toBe("detailed");
    expect(ent.dealRooms).toBe(false);
    expect(ent.bookkeeping).toBe(true);
  });

  it("returns correct values for pro plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(ent.businessLimit).toBe(5);
    expect(ent.valuationLevel).toBe("enhanced");
    expect(ent.dealRooms).toBe(true);
    expect(ent.bookkeeping).toBe(true);
    expect(ent.supportLevel).toBe("priority");
  });
});

// ─── getUserBillingState ──────────────────────────────────────────────────────

function makeSupabase(subRow: Record<string, unknown> | null, dbError?: boolean) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              maybeSingle: async () =>
                dbError
                  ? { data: null, error: { message: "db error" } }
                  : { data: subRow, error: null },
            }),
          }),
        }),
      }),
    }),
  };
}

describe("getUserBillingState", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      STRIPE_PRICE_STARTER: "price_starter",
      STRIPE_PRICE_BUILDER: "price_builder",
      STRIPE_PRICE_PRO: "price_pro",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns free plan when no subscription row exists", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = await getUserBillingState(makeSupabase(null) as any, "user-1");
    expect(state.plan).toBe("free");
    expect(state.entitlements.businessLimit).toBe(0);
  });

  it("returns free plan when subscription is canceled (not active/trialing)", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    const state = await getUserBillingState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSupabase({ status: "canceled", price_id: "price_starter", updated_at: "2026-01-01T00:00:00Z" }) as any,
      "user-1"
    );
    expect(state.plan).toBe("free");
  });

  it("returns free plan when price_id is unknown", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    const state = await getUserBillingState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSupabase({ status: "active", price_id: "price_unknown_xyz", updated_at: "2026-01-01T00:00:00Z" }) as any,
      "user-1"
    );
    expect(state.plan).toBe("free");
    expect(state.entitlements.businessLimit).toBe(0);
  });

  it("returns starter plan for active starter subscription", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    const state = await getUserBillingState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSupabase({ status: "active", price_id: "price_starter", cancel_at_period_end: false, current_period_end: "2026-09-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }) as any,
      "user-1"
    );
    expect(state.plan).toBe("starter");
    expect(state.entitlements.businessLimit).toBe(1);
    expect(state.cancelAtPeriodEnd).toBe(false);
    expect(state.currentPeriodEnd).toBe("2026-09-01T00:00:00Z");
  });

  it("returns free plan on DB error (fail closed)", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const state = await getUserBillingState(makeSupabase(null, true) as any, "user-1");
    expect(state.plan).toBe("free");
  });

  it("returns starter for trialing subscription", async () => {
    const { getUserBillingState } = await import("@/lib/billing");
    const state = await getUserBillingState(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeSupabase({ status: "trialing", price_id: "price_starter", cancel_at_period_end: false, updated_at: "2026-01-01T00:00:00Z" }) as any,
      "user-1"
    );
    expect(state.plan).toBe("starter");
  });
});

// ─── Limit helpers ────────────────────────────────────────────────────────────

describe("checkBusinessLimit", () => {
  it("returns error for free plan", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkBusinessLimit(ent, 0);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("PLAN_REQUIRED");
  });

  it("allows creating first business on starter", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkBusinessLimit(ent, 0);
    expect(err).toBeNull();
  });

  it("blocks second business on starter (limit 1)", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkBusinessLimit(ent, 1);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("BUSINESS_LIMIT");
  });

  it("allows second business on builder (limit 2)", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkBusinessLimit(ent, 1)).toBeNull();
    expect(checkBusinessLimit(ent, 2)).not.toBeNull();
  });
});

describe("checkMilestoneMonthlyLimit", () => {
  it("blocks milestones on free plan", async () => {
    const { checkMilestoneMonthlyLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkMilestoneMonthlyLimit(ent, 0)?.code).toBe("PLAN_REQUIRED");
  });

  it("allows up to 10 milestones per month on starter", async () => {
    const { checkMilestoneMonthlyLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    for (let i = 0; i < 10; i++) {
      expect(checkMilestoneMonthlyLimit(ent, i)).toBeNull();
    }
  });

  it("blocks the 11th milestone on starter", async () => {
    const { checkMilestoneMonthlyLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkMilestoneMonthlyLimit(ent, 10);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("MILESTONE_MONTHLY_LIMIT");
  });
});

// ─── Annual billing ───────────────────────────────────────────────────────────

describe("annual billing — getPlanPriceMapAnnual", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      STRIPE_PRICE_STARTER: "price_starter",
      STRIPE_PRICE_BUILDER: "price_builder",
      STRIPE_PRICE_PRO: "price_pro",
      STRIPE_PRICE_STARTER_ANNUAL: "price_starter_annual",
      STRIPE_PRICE_BUILDER_ANNUAL: "price_builder_annual",
      STRIPE_PRICE_PRO_ANNUAL: "price_pro_annual",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("getAllowedPriceIds includes all six price IDs", async () => {
    const { getAllowedPriceIds } = await import("@/lib/billing");
    const ids = getAllowedPriceIds();
    expect(ids.has("price_starter")).toBe(true);
    expect(ids.has("price_builder")).toBe(true);
    expect(ids.has("price_pro")).toBe(true);
    expect(ids.has("price_starter_annual")).toBe(true);
    expect(ids.has("price_builder_annual")).toBe(true);
    expect(ids.has("price_pro_annual")).toBe(true);
    expect(ids.size).toBe(6);
  });

  it("getPriceIdForPlan defaults to monthly when no interval supplied", async () => {
    const { getPriceIdForPlan } = await import("@/lib/billing");
    expect(getPriceIdForPlan("starter")).toBe("price_starter");
    expect(getPriceIdForPlan("builder")).toBe("price_builder");
    expect(getPriceIdForPlan("pro")).toBe("price_pro");
  });

  it("getPriceIdForPlan returns monthly price IDs for monthly interval", async () => {
    const { getPriceIdForPlan } = await import("@/lib/billing");
    expect(getPriceIdForPlan("starter", "monthly")).toBe("price_starter");
    expect(getPriceIdForPlan("builder", "monthly")).toBe("price_builder");
    expect(getPriceIdForPlan("pro", "monthly")).toBe("price_pro");
  });

  it("getPriceIdForPlan returns annual price IDs for annual interval", async () => {
    const { getPriceIdForPlan } = await import("@/lib/billing");
    expect(getPriceIdForPlan("starter", "annual")).toBe("price_starter_annual");
    expect(getPriceIdForPlan("builder", "annual")).toBe("price_builder_annual");
    expect(getPriceIdForPlan("pro", "annual")).toBe("price_pro_annual");
  });

  it("getPlanByPriceId maps annual price IDs to the same plan entitlements", async () => {
    const { getPlanByPriceId, getEntitlementsByPlan } = await import("@/lib/billing");
    const starterAnnualPlan = getPlanByPriceId("price_starter_annual");
    const builderAnnualPlan = getPlanByPriceId("price_builder_annual");
    const proAnnualPlan = getPlanByPriceId("price_pro_annual");
    expect(starterAnnualPlan).toBe("starter");
    expect(builderAnnualPlan).toBe("builder");
    expect(proAnnualPlan).toBe("pro");
    // Same entitlements as monthly counterparts
    expect(getEntitlementsByPlan("starter")).toEqual(getEntitlementsByPlan(starterAnnualPlan!));
    expect(getEntitlementsByPlan("builder")).toEqual(getEntitlementsByPlan(builderAnnualPlan!));
    expect(getEntitlementsByPlan("pro")).toEqual(getEntitlementsByPlan(proAnnualPlan!));
  });

  it("getPlanByPriceId still maps monthly price IDs correctly", async () => {
    const { getPlanByPriceId } = await import("@/lib/billing");
    expect(getPlanByPriceId("price_starter")).toBe("starter");
    expect(getPlanByPriceId("price_builder")).toBe("builder");
    expect(getPlanByPriceId("price_pro")).toBe("pro");
  });

  it("getPriceIdForPlan returns null for an unknown plan", async () => {
    const { getPriceIdForPlan } = await import("@/lib/billing");
    expect(getPriceIdForPlan("enterprise", "annual")).toBeNull();
  });
});

describe("annual billing — PLAN_CATALOG annualPrice", () => {
  it("PLAN_CATALOG has correct annual prices for all plans", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const byKey = Object.fromEntries(PLAN_CATALOG.map((p) => [p.key, p]));
    expect(byKey["free"].annualPrice).toBe(0);
    expect(byKey["starter"].annualPrice).toBe(50);
    expect(byKey["builder"].annualPrice).toBe(100);
    expect(byKey["pro"].annualPrice).toBe(200);
  });

  it("PLAN_CATALOG monthly prices remain correct", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const byKey = Object.fromEntries(PLAN_CATALOG.map((p) => [p.key, p]));
    expect(byKey["free"].monthlyPrice).toBe(0);
    expect(byKey["starter"].monthlyPrice).toBe(5);
    expect(byKey["builder"].monthlyPrice).toBe(10);
    expect(byKey["pro"].monthlyPrice).toBe(20);
  });
});

describe("checkDocumentLimits", () => {
  const MB = 1024 * 1024;

  it("blocks uploads on free plan", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkDocumentLimits(ent, 0, 0, 1024);
    expect(err?.code).toBe("PLAN_REQUIRED");
  });

  it("allows upload within starter limits", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkDocumentLimits(ent, 5, 100 * MB, 10 * MB)).toBeNull();
  });

  it("blocks the 11th document on starter (limit 10)", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    const err = checkDocumentLimits(ent, 10, 100 * MB, 1024);
    expect(err?.code).toBe("DOCUMENT_LIMIT");
  });

  it("blocks upload exceeding 500 MB storage cap on starter", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    // 490 MB used + 20 MB file = 510 MB > 500 MB
    const err = checkDocumentLimits(ent, 5, 490 * MB, 20 * MB);
    expect(err?.code).toBe("STORAGE_LIMIT");
  });
});
