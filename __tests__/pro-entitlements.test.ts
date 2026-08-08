/**
 * Pro Entitlement Tests
 *
 * Tests Pro-specific entitlements, plan catalog, and new limit helpers.
 */

describe("Pro entitlements", () => {
  it("pro plan has all Pro-specific capabilities enabled", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(ent.saleReadiness).toBe(true);
    expect(ent.customerConcentration).toBe(true);
    expect(ent.weeklyValuationRefresh).toBe(true);
    expect(ent.sellerCommandCenter).toBe(true);
    expect(ent.dealRooms).toBe(true);
    expect(ent.activeDealRoomLimit).toBe(3);
    expect(ent.teamMemberLimit).toBe(5);
    expect(ent.businessLimit).toBe(5);
    expect(ent.leadLimit).toBe(1000);
    expect(ent.documentLimit).toBe(1000);
    expect(ent.storageBytes).toBe(50 * 1024 * 1024 * 1024); // 50 GB
    expect(ent.supportLevel).toBe("priority");
    expect(ent.valuationLevel).toBe("enhanced");
    expect(ent.healthLevel).toBe("advanced");
    expect(ent.bookkeeping).toBe(true);
  });

  it("free plan includes core intelligence while keeping Pro-only automation gated", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(ent.saleReadiness).toBe(true);
    expect(ent.customerConcentration).toBe(true);
    expect(ent.weeklyValuationRefresh).toBe(false);
    expect(ent.sellerCommandCenter).toBe(false);
    expect(ent.dealRooms).toBe(false);
    expect(ent.activeDealRoomLimit).toBe(0);
  });

  it("builder plan keeps core intelligence and zero included Deal Rooms", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(ent.saleReadiness).toBe(true);
    expect(ent.customerConcentration).toBe(true);
    expect(ent.weeklyValuationRefresh).toBe(false);
    expect(ent.sellerCommandCenter).toBe(false);
    expect(ent.dealRooms).toBe(false);
    expect(ent.activeDealRoomLimit).toBe(0);
  });
});

describe("checkDealRoomLimit", () => {
  it("allows first deal room on pro (limit=3)", async () => {
    const { checkDealRoomLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkDealRoomLimit(ent, 0)).toBeNull();
    expect(checkDealRoomLimit(ent, 1)).toBeNull();
    expect(checkDealRoomLimit(ent, 2)).toBeNull();
  });

  it("blocks 4th deal room on pro (limit=3)", async () => {
    const { checkDealRoomLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    const err = checkDealRoomLimit(ent, 3);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("FEATURE_GATED");
    expect(err?.message).toContain("3");
  });

  it("blocks deal rooms for free plan", async () => {
    const { checkDealRoomLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    const err = checkDealRoomLimit(ent, 0);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("PLAN_REQUIRED");
  });

  it("blocks deal rooms for builder plan", async () => {
    const { checkDealRoomLimit, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    const err = checkDealRoomLimit(ent, 0);
    expect(err).not.toBeNull();
    expect(err?.code).toBe("PLAN_REQUIRED");
  });
});

describe("checkProFeature", () => {
  it("allows saleReadiness for pro plan", async () => {
    const { checkProFeature, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("pro");
    expect(checkProFeature(ent, "saleReadiness")).toBeNull();
  });

  it("allows saleReadiness for builder plan", async () => {
    const { checkProFeature, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkProFeature(ent, "saleReadiness")).toBeNull();
  });

  it("allows customerConcentration for free plan", async () => {
    const { checkProFeature, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("free");
    expect(checkProFeature(ent, "customerConcentration")).toBeNull();
  });

  it("blocks sellerCommandCenter for builder plan", async () => {
    const { checkProFeature, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("builder");
    expect(checkProFeature(ent, "sellerCommandCenter")).not.toBeNull();
  });

  it("blocks weeklyValuationRefresh for starter", async () => {
    const { checkProFeature, getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(checkProFeature(ent, "weeklyValuationRefresh")).not.toBeNull();
  });
});

describe("PLAN_CATALOG", () => {
  it("has 4 entries matching free/starter/builder/pro", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const keys = PLAN_CATALOG.map((p) => p.key);
    expect(keys).toContain("free");
    expect(keys).toContain("starter");
    expect(keys).toContain("builder");
    expect(keys).toContain("pro");
    expect(PLAN_CATALOG).toHaveLength(4);
  });

  it("pro catalog entry has correct price and deal room description", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const pro = PLAN_CATALOG.find((p) => p.key === "pro")!;
    expect(pro.monthlyPrice).toBe(20);
    expect(pro.dealRoomDescription).toContain("3");
    expect(pro.teamSeatDescription).toContain("owner excluded");
    expect(pro.teamSeatDescription).toContain("deal room participants excluded");
    expect(pro.storageDescription).toContain("50 GB");
    expect(pro.supportLevel).toBe("priority");
  });

  it("pro public features match entitlements", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const pro = PLAN_CATALOG.find((p) => p.key === "pro")!;
    expect(pro.publicFeatures.some((f) => f.includes("Deal Room"))).toBe(true);
    expect(pro.publicFeatures.some((f) => f.includes("1,000"))).toBe(true);
    expect(pro.publicFeatures.some((f) => f.includes("50 GB"))).toBe(true);
    expect(pro.publicFeatures.some((f) => f.includes("Sale-Readiness"))).toBe(true);
  });

  it("upgrade order is monotonically increasing free<starter<builder<pro", async () => {
    const { PLAN_CATALOG } = await import("@/lib/billing");
    const free = PLAN_CATALOG.find((p) => p.key === "free")!;
    const starter = PLAN_CATALOG.find((p) => p.key === "starter")!;
    const builder = PLAN_CATALOG.find((p) => p.key === "builder")!;
    const pro = PLAN_CATALOG.find((p) => p.key === "pro")!;
    expect(free.upgradeOrder).toBeLessThan(starter.upgradeOrder);
    expect(starter.upgradeOrder).toBeLessThan(builder.upgradeOrder);
    expect(builder.upgradeOrder).toBeLessThan(pro.upgradeOrder);
  });

  it("getPlanCatalogEntry returns correct entry", async () => {
    const { getPlanCatalogEntry } = await import("@/lib/billing");
    const pro = getPlanCatalogEntry("pro");
    expect(pro.key).toBe("pro");
    expect(pro.monthlyPrice).toBe(20);
  });
});
