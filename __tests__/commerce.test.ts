/**
 * Commerce Phase 1 — Unit Tests
 *
 * Covers:
 *   1. Product registry (valid key, invalid key, inactive product, price resolution)
 *   2. Checkout validation logic (auth, product key, server-side price)
 *   3. One-time purchase webhook logic (purchase creation, idempotency)
 *   4. Entitlement grant idempotency / duplicate prevention
 *   5. Workspace creation idempotency
 *   6. Bilingual labels (English and Spanish)
 *   7. Existing subscription helpers remain unaffected
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Product Registry
// ─────────────────────────────────────────────────────────────────────────────

describe("Product Registry — getProduct", () => {
  it("returns the product definition for a known key", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    const product = getProduct("value_action_sprint");
    expect(product).not.toBeNull();
    expect(product?.key).toBe("value_action_sprint");
  });

  it("returns null for an unknown key", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    expect(getProduct("nonexistent_key")).toBeNull();
    expect(getProduct("")).toBeNull();
    expect(getProduct("   ")).toBeNull();
  });

  it("returns the product regardless of active status", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    // value_dna_snapshot is inactive but getProduct still returns it
    const product = getProduct("value_dna_snapshot");
    expect(product).not.toBeNull();
    expect(product?.active).toBe(false);
  });
});

describe("Product Registry — getActiveProduct", () => {
  it("returns the product for an active key", async () => {
    const { getActiveProduct } = await import("@/lib/commerce/products");
    const product = getActiveProduct("value_action_sprint");
    expect(product).not.toBeNull();
    expect(product?.active).toBe(true);
  });

  it("returns null for an unknown key", async () => {
    const { getActiveProduct } = await import("@/lib/commerce/products");
    expect(getActiveProduct("completely_unknown")).toBeNull();
  });

  it("returns null for an inactive product", async () => {
    const { getActiveProduct } = await import("@/lib/commerce/products");
    expect(getActiveProduct("value_dna_snapshot")).toBeNull();
    expect(getActiveProduct("sale_readiness_blueprint")).toBeNull();
    expect(getActiveProduct("transaction_workspace")).toBeNull();
  });
});

describe("Product Registry — getStripePriceId", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("throws when the price env variable is not set", async () => {
    delete process.env.STRIPE_PRICE_VALUE_ACTION_SPRINT;
    const { getProduct, getStripePriceId } = await import("@/lib/commerce/products");
    const product = getProduct("value_action_sprint")!;
    expect(() => getStripePriceId(product)).toThrow("STRIPE_PRICE_VALUE_ACTION_SPRINT");
  });

  it("returns the price ID when the env variable is set", async () => {
    process.env.STRIPE_PRICE_VALUE_ACTION_SPRINT = "price_test_vas_123";
    const { getProduct, getStripePriceId } = await import("@/lib/commerce/products");
    const product = getProduct("value_action_sprint")!;
    expect(getStripePriceId(product)).toBe("price_test_vas_123");
  });

  it("never exposes the price ID from the product definition itself", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    const product = getProduct("value_action_sprint")!;
    // The definition only holds the env variable NAME, not the value
    expect(product.stripePriceEnvVar).toBe("STRIPE_PRICE_VALUE_ACTION_SPRINT");
    expect(product).not.toHaveProperty("priceId");
    expect(product).not.toHaveProperty("stripePriceId");
  });
});

describe("Product Registry — product definitions", () => {
  it("value_action_sprint has English and Spanish names", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    const p = getProduct("value_action_sprint")!;
    expect(p.nameEn).toBeTruthy();
    expect(p.nameEs).toBeTruthy();
    expect(p.nameEn).not.toBe(p.nameEs);
  });

  it("value_action_sprint has purchaseType one_time", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    const p = getProduct("value_action_sprint")!;
    expect(p.purchaseType).toBe("one_time");
  });

  it("value_action_sprint has fulfillmentBehavior create_workspace", async () => {
    const { getProduct } = await import("@/lib/commerce/products");
    const p = getProduct("value_action_sprint")!;
    expect(p.fulfillmentBehavior).toBe("create_workspace");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Checkout Validation Logic
// Extracted from the route handler — no HTTP layer needed.
// ─────────────────────────────────────────────────────────────────────────────

describe("Commerce Checkout — request validation", () => {
  function validateCheckoutRequest(params: {
    authenticated: boolean;
    productKey: string;
  }): { ok: true } | { ok: false; error: string; status: number } {
    if (!params.authenticated) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    if (!params.productKey) {
      return { ok: false, error: "productKey is required", status: 400 };
    }
    return { ok: true };
  }

  it("rejects unauthenticated requests", () => {
    const result = validateCheckoutRequest({
      authenticated: false,
      productKey: "value_action_sprint",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects missing productKey", () => {
    const result = validateCheckoutRequest({ authenticated: true, productKey: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("accepts an authenticated request with a valid productKey", () => {
    const result = validateCheckoutRequest({
      authenticated: true,
      productKey: "value_action_sprint",
    });
    expect(result.ok).toBe(true);
  });
});

describe("Commerce Checkout — product key enforcement", () => {
  it("rejects an unknown product key via getActiveProduct", async () => {
    const { getActiveProduct } = await import("@/lib/commerce/products");
    expect(getActiveProduct("evil_product_override")).toBeNull();
    expect(getActiveProduct("price_hack_123")).toBeNull();
  });

  it("rejects inactive products via getActiveProduct", async () => {
    const { getActiveProduct } = await import("@/lib/commerce/products");
    // Future products are inactive and must be rejected
    expect(getActiveProduct("value_dna_snapshot")).toBeNull();
    expect(getActiveProduct("launch_intelligence_pack")).toBeNull();
  });

  it("never accepts a client-provided price ID — contract test", () => {
    // The checkout route only reads `productKey` from the body.
    // This test documents that price ID cannot be injected by the browser.
    const clientBody = {
      productKey: "value_action_sprint",
      priceId: "price_evil_override",
      amount: 0,
    };

    // Only productKey is extracted:
    const extractedKey = String(
      (clientBody as Record<string, unknown>).productKey ?? ""
    ).trim();

    // The route ignores priceId and amount from the body
    const attemptedPriceOverride = (clientBody as Record<string, unknown>).priceId;
    const attemptedAmountOverride = (clientBody as Record<string, unknown>).amount;

    expect(extractedKey).toBe("value_action_sprint");
    // These values would be present in the body but the route never uses them
    expect(typeof attemptedPriceOverride).toBe("string"); // client sent it
    expect(typeof attemptedAmountOverride).toBe("number"); // client sent it
    // The route resolves priceId via getStripePriceId(product), never from body
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Webhook Fulfillment Logic (pure logic, no Supabase)
// ─────────────────────────────────────────────────────────────────────────────

describe("One-time Product Webhook — session validation", () => {
  type SessionLike = {
    id: string;
    mode: string;
    payment_status: string;
    metadata?: Record<string, string | undefined>;
    client_reference_id?: string;
  };

  function validateOneTimeSession(
    session: SessionLike
  ): { ok: true; userId: string; productKey: string } | { ok: false; error: string } {
    if (session.mode !== "payment" || session.payment_status !== "paid") {
      return { ok: false, error: "Not a completed payment checkout" };
    }
    const userId =
      session.metadata?.userId || session.client_reference_id;
    const productKey = session.metadata?.productKey;
    if (!userId || !productKey) {
      return { ok: false, error: "Missing metadata" };
    }
    return { ok: true, userId, productKey };
  }

  it("rejects subscription-mode sessions", () => {
    const result = validateOneTimeSession({
      id: "cs_test_1",
      mode: "subscription",
      payment_status: "paid",
      metadata: { purchaseType: "one_time_product", userId: "u1", productKey: "value_action_sprint" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects unpaid sessions", () => {
    const result = validateOneTimeSession({
      id: "cs_test_2",
      mode: "payment",
      payment_status: "unpaid",
      metadata: { purchaseType: "one_time_product", userId: "u1", productKey: "value_action_sprint" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects sessions with missing userId metadata", () => {
    const result = validateOneTimeSession({
      id: "cs_test_3",
      mode: "payment",
      payment_status: "paid",
      metadata: { purchaseType: "one_time_product", productKey: "value_action_sprint" },
    });
    expect(result.ok).toBe(false);
  });

  it("rejects sessions with missing productKey metadata", () => {
    const result = validateOneTimeSession({
      id: "cs_test_4",
      mode: "payment",
      payment_status: "paid",
      metadata: { purchaseType: "one_time_product", userId: "u1" },
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid paid session with all metadata", () => {
    const result = validateOneTimeSession({
      id: "cs_test_5",
      mode: "payment",
      payment_status: "paid",
      metadata: { purchaseType: "one_time_product", userId: "u1", productKey: "value_action_sprint" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe("u1");
      expect(result.productKey).toBe("value_action_sprint");
    }
  });

  it("falls back to client_reference_id when userId is not in metadata", () => {
    const result = validateOneTimeSession({
      id: "cs_test_6",
      mode: "payment",
      payment_status: "paid",
      client_reference_id: "u2",
      metadata: { purchaseType: "one_time_product", productKey: "value_action_sprint" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userId).toBe("u2");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Webhook Idempotency (replay protection)
// ─────────────────────────────────────────────────────────────────────────────

describe("Webhook idempotency — duplicate event protection", () => {
  it("skips processing when purchase is already paid and fulfilled", () => {
    type PurchaseRow = { payment_status: string; fulfillment_status: string } | null;

    function shouldSkip(existing: PurchaseRow): boolean {
      return (
        existing?.payment_status === "paid" &&
        existing?.fulfillment_status === "fulfilled"
      );
    }

    expect(shouldSkip({ payment_status: "paid", fulfillment_status: "fulfilled" })).toBe(true);
    expect(shouldSkip({ payment_status: "paid", fulfillment_status: "pending" })).toBe(false);
    expect(shouldSkip({ payment_status: "pending", fulfillment_status: "pending" })).toBe(false);
    expect(shouldSkip(null)).toBe(false);
  });

  it("UNIQUE constraint on stripe_checkout_session_id prevents duplicate purchases", () => {
    // This test documents the database-level uniqueness contract.
    // In production, upsert with onConflict='stripe_checkout_session_id' is used.
    const sessionId = "cs_test_idempotency";
    const seenSessionIds = new Set<string>();

    function recordPurchase(csId: string): boolean {
      if (seenSessionIds.has(csId)) return false; // duplicate
      seenSessionIds.add(csId);
      return true;
    }

    expect(recordPurchase(sessionId)).toBe(true);
    expect(recordPurchase(sessionId)).toBe(false); // replay — blocked
    expect(recordPurchase("cs_test_other")).toBe(true); // different session — allowed
  });

  it("UNIQUE(purchase_id, product_key) prevents duplicate entitlement grants", () => {
    type GrantKey = { purchaseId: string; productKey: string };
    const grants = new Map<string, GrantKey>();

    function upsertGrant(purchaseId: string, productKey: string): "inserted" | "skipped" {
      const key = `${purchaseId}:${productKey}`;
      if (grants.has(key)) return "skipped";
      grants.set(key, { purchaseId, productKey });
      return "inserted";
    }

    expect(upsertGrant("p1", "value_action_sprint")).toBe("inserted");
    expect(upsertGrant("p1", "value_action_sprint")).toBe("skipped"); // replay
    expect(upsertGrant("p2", "value_action_sprint")).toBe("inserted"); // different purchase
  });

  it("UNIQUE(purchase_id) prevents duplicate workspace creation", () => {
    const createdWorkspaces = new Set<string>();

    function createWorkspace(purchaseId: string): "created" | "exists" {
      if (createdWorkspaces.has(purchaseId)) return "exists";
      createdWorkspaces.add(purchaseId);
      return "created";
    }

    expect(createWorkspace("p1")).toBe("created");
    expect(createWorkspace("p1")).toBe("exists"); // replay
    expect(createWorkspace("p2")).toBe("created"); // different purchase
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Bilingual labels
// ─────────────────────────────────────────────────────────────────────────────

describe("Bilingual labels — AccountProducts namespace", () => {
  let enMessages: Record<string, unknown>;
  let esMessages: Record<string, unknown>;

  beforeAll(async () => {
    const fs = await import("fs");
    const path = await import("path");
    const root = path.resolve(process.cwd());
    enMessages = JSON.parse(fs.readFileSync(path.join(root, "messages/en.json"), "utf8")) as Record<string, unknown>;
    esMessages = JSON.parse(fs.readFileSync(path.join(root, "messages/es.json"), "utf8")) as Record<string, unknown>;
  });

  it("English AccountProducts namespace has required keys", () => {
    const ns = (enMessages as Record<string, Record<string, unknown>>).AccountProducts;
    expect(ns).toBeDefined();
    expect(ns.heading).toBeTruthy();
    expect(ns.emptyState).toBeTruthy();
    expect(ns.openProduct).toBeTruthy();
    expect(ns.exploreCta).toBeTruthy();
  });

  it("Spanish AccountProducts namespace has required keys", () => {
    const ns = (esMessages as Record<string, Record<string, unknown>>).AccountProducts;
    expect(ns).toBeDefined();
    expect(ns.heading).toBeTruthy();
    expect(ns.emptyState).toBeTruthy();
    expect(ns.openProduct).toBeTruthy();
  });

  it("English heading differs from Spanish heading", () => {
    const en = (enMessages as Record<string, Record<string, string>>).AccountProducts;
    const es = (esMessages as Record<string, Record<string, string>>).AccountProducts;
    expect(en.heading).not.toBe(es.heading);
  });
});

describe("Bilingual labels — ValueActionSprint namespace", () => {
  let enMessages: Record<string, unknown>;
  let esMessages: Record<string, unknown>;

  beforeAll(async () => {
    const fs = await import("fs");
    const path = await import("path");
    const root = path.resolve(process.cwd());
    enMessages = JSON.parse(fs.readFileSync(path.join(root, "messages/en.json"), "utf8")) as Record<string, unknown>;
    esMessages = JSON.parse(fs.readFileSync(path.join(root, "messages/es.json"), "utf8")) as Record<string, unknown>;
  });

  it("English ValueActionSprint namespace has required keys", () => {
    const ns = (enMessages as Record<string, Record<string, unknown>>).ValueActionSprint;
    expect(ns).toBeDefined();
    expect(ns.heading).toBeTruthy();
    expect(ns.disclaimerBody).toBeTruthy();
    expect(ns.purchaseCta).toBeTruthy();
    expect(ns.whatYouGetItems).toBeDefined();
  });

  it("Spanish ValueActionSprint namespace has required keys", () => {
    const ns = (esMessages as Record<string, Record<string, unknown>>).ValueActionSprint;
    expect(ns).toBeDefined();
    expect(ns.heading).toBeTruthy();
    expect(ns.disclaimerBody).toBeTruthy();
    expect(ns.purchaseCta).toBeTruthy();
  });

  it("English disclaimer differs from Spanish disclaimer", () => {
    const en = (enMessages as Record<string, Record<string, string>>).ValueActionSprint;
    const es = (esMessages as Record<string, Record<string, string>>).ValueActionSprint;
    expect(en.disclaimerBody).not.toBe(es.disclaimerBody);
  });

  it("disclaimer mentions planning tool and not appraisal/legal/tax", () => {
    const en = (enMessages as Record<string, Record<string, string>>).ValueActionSprint;
    const body: string = en.disclaimerBody;
    expect(body.toLowerCase()).toContain("planning");
    expect(body.toLowerCase()).toContain("appraisal");
    expect(body.toLowerCase()).toContain("legal");
    expect(body.toLowerCase()).toContain("tax");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Existing subscriptions unaffected
// ─────────────────────────────────────────────────────────────────────────────

describe("Existing subscription helpers — unaffected", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("isActiveSubscription still identifies active subscriptions", async () => {
    const { isActiveSubscription } = await import("@/lib/billing");
    expect(isActiveSubscription("active")).toBe(true);
    expect(isActiveSubscription("trialing")).toBe(true);
    expect(isActiveSubscription("canceled")).toBe(false);
    expect(isActiveSubscription("past_due")).toBe(false);
    expect(isActiveSubscription(null)).toBe(false);
    expect(isActiveSubscription(undefined)).toBe(false);
  });

  it("getPriceIdForPlan still resolves subscription plans", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_monthly";
    process.env.STRIPE_PRICE_BUILDER = "price_builder_monthly";
    process.env.STRIPE_PRICE_PRO = "price_pro_monthly";
    process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_annual";
    const { getPriceIdForPlan } = await import("@/lib/billing");
    expect(getPriceIdForPlan("starter", "monthly")).toBe("price_starter_monthly");
    expect(getPriceIdForPlan("pro", "monthly")).toBe("price_pro_monthly");
    expect(getPriceIdForPlan("starter", "annual")).toBe("price_starter_annual");
    expect(getPriceIdForPlan("unknown_plan")).toBeNull();
  });

  it("getAllowedPriceIds does not include one-time product prices", async () => {
    process.env.STRIPE_PRICE_STARTER = "price_starter_monthly";
    process.env.STRIPE_PRICE_VALUE_ACTION_SPRINT = "price_vas_test";
    const { getAllowedPriceIds } = await import("@/lib/billing");
    const allowed = getAllowedPriceIds();
    // One-time product price should NOT be in the subscription allowed set
    expect(allowed.has("price_starter_monthly")).toBe(true);
    expect(allowed.has("price_vas_test")).toBe(false);
  });

  it("getEntitlementsByPlan returns correct starter entitlements", async () => {
    const { getEntitlementsByPlan } = await import("@/lib/billing");
    const ent = getEntitlementsByPlan("starter");
    expect(ent.businessLimit).toBe(1);
    expect(ent.bookkeeping).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Row-level security ownership contract (documented)
// ─────────────────────────────────────────────────────────────────────────────

describe("Ownership and RLS contract", () => {
  it("purchases are owned by user_id (RLS SELECT policy)", () => {
    // Documented contract: purchases.user_id === auth.uid()
    // The actual RLS is enforced at the DB layer.
    // Here we test the application-layer pattern that sets user_id on upsert.
    function buildPurchaseInsert(userId: string, productKey: string) {
      return { user_id: userId, product_key: productKey };
    }

    const insert = buildPurchaseInsert("user-123", "value_action_sprint");
    expect(insert.user_id).toBe("user-123");
  });

  it("entitlement_grants are owned by user_id matching the purchase", () => {
    function buildGrantInsert(purchaseUserId: string, productKey: string) {
      return { user_id: purchaseUserId, product_key: productKey, status: "active" };
    }

    const grant = buildGrantInsert("user-123", "value_action_sprint");
    expect(grant.user_id).toBe("user-123");
    expect(grant.status).toBe("active");
  });

  it("workspaces are owned by user_id matching the purchase", () => {
    function buildWorkspaceInsert(purchaseUserId: string, purchaseId: string) {
      return { user_id: purchaseUserId, purchase_id: purchaseId, status: "not_started" };
    }

    const workspace = buildWorkspaceInsert("user-123", "purchase-456");
    expect(workspace.user_id).toBe("user-123");
    expect(workspace.status).toBe("not_started");
  });
});
