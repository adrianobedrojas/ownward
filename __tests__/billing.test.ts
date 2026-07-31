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
