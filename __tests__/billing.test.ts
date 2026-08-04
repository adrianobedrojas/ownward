/**
 * Billing & Entitlement Tests
 *
 * Tests the entitlement model, billing state, and limit helpers.
 * No Supabase or Stripe connections required.
 */

// ─── Entitlement model ────────────────────────────────────────────────────────

describe("getEntitlementsByPlan", () => {
  it("returns Explorer entitlements for free plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(ent.businessLimit).toBe(1);
    expect(ent.listingLimit).toBe(1);
    expect(ent.documentLimit).toBe(3);
    expect(ent.storageBytes).toBe(100 * 1024 * 1024); // 100 MB
    expect(ent.milestoneMonthlyLimit).toBe(3);
    expect(ent.leadLimit).toBe(5);
    expect(ent.bookkeeping).toBe(false);
    expect(ent.dealRooms).toBe(false);
    expect(ent.healthLevel).toBe("basic");
    expect(ent.valuationLevel).toBe("preview");
    expect(ent.supportLevel).toBe("general");
    expect(ent.listingImageLimit).toBe(3);
    expect(ent.savedListingLimit).toBe(5);
    expect(ent.listingComparisonLimit).toBe(2);
    expect(ent.confidentialListings).toBe(false);
  });

  it("returns correct values for starter plan", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(ent.businessLimit).toBe(1);
    expect(ent.listingLimit).toBe(1);
    expect(ent.documentLimit).toBe(10);
    expect(ent.storageBytes).toBe(500 * 1024 * 1024); // 500 MB
    expect(ent.milestoneMonthlyLimit).toBe(10);
    expect(ent.leadLimit).toBe(25);
    expect(ent.bookkeeping).toBe(true);
    expect(ent.dealRooms).toBe(false);
    expect(ent.healthLevel).toBe("basic");
    expect(ent.valuationLevel).toBe("basic");
    expect(ent.supportLevel).toBe("standard");
    expect(ent.listingImageLimit).toBe(10);
    expect(ent.savedListingLimit).toBe(25);
    expect(ent.listingComparisonLimit).toBe(3);
    expect(ent.confidentialListings).toBe(true);
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
    expect(state.entitlements.businessLimit).toBe(1); // Explorer has 1 workspace
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
    expect(state.entitlements.businessLimit).toBe(1); // Explorer has 1 workspace
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
  it("allows creating first business on Explorer (free) plan", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkBusinessLimit(ent, 0);
    expect(err).toBeNull();
  });

  it("blocks second business on Explorer (free) plan (limit 1)", async () => {
    const { checkBusinessLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkBusinessLimit(ent, 1);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("BUSINESS_LIMIT");
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
  it("allows up to 3 milestones per month on Explorer (free) plan", async () => {
    const { checkMilestoneMonthlyLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkMilestoneMonthlyLimit(ent, 0)).toBeNull();
    expect(checkMilestoneMonthlyLimit(ent, 1)).toBeNull();
    expect(checkMilestoneMonthlyLimit(ent, 2)).toBeNull();
  });

  it("blocks the 4th milestone on Explorer (free) plan (limit 3)", async () => {
    const { checkMilestoneMonthlyLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkMilestoneMonthlyLimit(ent, 3);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("MILESTONE_MONTHLY_LIMIT");
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

// ─── Subscription billing intervals ──────────────────────────────────────────

describe("subscription billing intervals", () => {
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

  it("getAllowedPriceIds includes monthly and annual subscription price IDs", async () => {
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

  it("getPlanByPriceId maps annual price IDs", async () => {
    const { getPlanByPriceId } = await import("@/lib/billing");
    expect(getPlanByPriceId("price_starter_annual")).toBe("starter");
    expect(getPlanByPriceId("price_builder_annual")).toBe("builder");
    expect(getPlanByPriceId("price_pro_annual")).toBe("pro");
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

describe("PLAN_CATALOG annual pricing", () => {
  it("PLAN_CATALOG annual prices are available for paid plans", async () => {
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

  it("allows first upload on Explorer (free) plan within limits", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    // Explorer: 3 docs / 100 MB — first upload should be allowed
    const err = checkDocumentLimits(ent, 0, 0, 1024);
    expect(err).toBeNull();
  });

  it("blocks the 4th document on Explorer (free) plan (limit 3)", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkDocumentLimits(ent, 3, 10 * MB, 1024);
    expect(err?.code).toBe("DOCUMENT_LIMIT");
  });

  it("blocks upload exceeding 100 MB storage cap on Explorer (free) plan", async () => {
    const { checkDocumentLimits, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    // 95 MB used + 10 MB file = 105 MB > 100 MB
    const err = checkDocumentLimits(ent, 1, 95 * MB, 10 * MB);
    expect(err?.code).toBe("STORAGE_LIMIT");
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

// ─── Saved listing limits ──────────────────────────────────────────────────────

describe("checkSavedListingLimit", () => {
  it("allows first save on Explorer (free) plan", async () => {
    const { checkSavedListingLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkSavedListingLimit(ent, 0)).toBeNull();
  });

  it("allows fifth save on Explorer (free) plan (limit 5)", async () => {
    const { checkSavedListingLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkSavedListingLimit(ent, 4)).toBeNull();
  });

  it("blocks sixth save on Explorer (free) plan (limit 5)", async () => {
    const { checkSavedListingLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkSavedListingLimit(ent, 5);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("SAVED_LISTING_LIMIT");
  });

  it("allows up to 25 saves on starter", async () => {
    const { checkSavedListingLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkSavedListingLimit(ent, 24)).toBeNull();
    const err = checkSavedListingLimit(ent, 25);
    expect(err?.code).toBe("SAVED_LISTING_LIMIT");
  });
});

// ─── Comparison limits ──────────────────────────────────────────────────────────

describe("checkListingComparisonLimit", () => {
  it("allows comparing 2 businesses on Explorer (free) plan", async () => {
    const { checkListingComparisonLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkListingComparisonLimit(ent, 2)).toBeNull();
  });

  it("blocks comparing 3 businesses on Explorer (free) plan (limit 2)", async () => {
    const { checkListingComparisonLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkListingComparisonLimit(ent, 3);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("COMPARISON_LIMIT");
  });

  it("allows comparing 10 businesses on Pro plan", async () => {
    const { checkListingComparisonLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkListingComparisonLimit(ent, 10)).toBeNull();
  });

  it("blocks comparing 11 businesses on Pro plan (limit 10)", async () => {
    const { checkListingComparisonLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    const err = checkListingComparisonLimit(ent, 11);
    expect(err?.code).toBe("COMPARISON_LIMIT");
  });
});

// ─── Confidential listing access ──────────────────────────────────────────────

describe("checkConfidentialListingAccess", () => {
  it("blocks confidential listings on Explorer (free) plan", async () => {
    const { checkConfidentialListingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkConfidentialListingAccess(ent);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("CONFIDENTIAL_LISTING_GATED");
  });

  it("allows confidential listings on starter plan", async () => {
    const { checkConfidentialListingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkConfidentialListingAccess(ent)).toBeNull();
  });

  it("allows confidential listings on builder plan", async () => {
    const { checkConfidentialListingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkConfidentialListingAccess(ent)).toBeNull();
  });

  it("allows confidential listings on pro plan", async () => {
    const { checkConfidentialListingAccess, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkConfidentialListingAccess(ent)).toBeNull();
  });
});

// ─── Explorer plan catalog entry ──────────────────────────────────────────────

describe("Explorer plan catalog", () => {
  it("PLAN_CATALOG free entry has name Explorer", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const freeEntry = PLAN_CATALOG.find((p) => p.key === "free");
    expect(freeEntry?.name).toBe("Explorer");
    expect(freeEntry?.monthlyPrice).toBe(0);
    expect(freeEntry?.annualPrice).toBe(0);
  });

  it("Explorer entitlements include Explorer-level capabilities", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const freeEntry = PLAN_CATALOG.find((p) => p.key === "free")!;
    expect(freeEntry.entitlements.businessLimit).toBe(1);
    expect(freeEntry.entitlements.listingLimit).toBe(1);
    expect(freeEntry.entitlements.savedListingLimit).toBe(5);
    expect(freeEntry.entitlements.listingComparisonLimit).toBe(2);
    expect(freeEntry.entitlements.confidentialListings).toBe(false);
  });
});
