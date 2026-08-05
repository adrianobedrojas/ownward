import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

type Row = Record<string, unknown>;
type Filters = Array<{ type: "eq" | "neq" | "in" | "contains"; column: string; value: unknown }>;

class InMemorySupabaseAdmin {
  private counters: Record<string, number> = {};
  private failpoints: Record<string, number> = {};

  public tables: Record<string, Row[]> = {
    stripe_events: [],
    purchases: [],
    purchase_items: [],
    entitlement_grants: [],
    paid_valuation_report_deliveries: [],
    deal_room_paid_access: [],
    confidential_sale_launches: [],
    value_action_sprint_workspaces: [],
    business_listings: [],
    businesses: [],
    conversations: [],
    deal_rooms: [],
    deal_room_members: [],
    deal_room_activity: [],
    valuation_reports: [],
    listing_promotions: [],
    subscriptions: [],
  };

  constructor() {
    this.seedBaseFixtures();
  }

  private seedBaseFixtures() {
    this.tables.businesses.push({
      id: "11111111-1111-4111-8111-111111111111",
      owner_id: "00000000-0000-4000-8000-000000000001",
      deleted_at: null,
      name: "Test Business",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    this.tables.business_listings.push({
      id: "22222222-2222-4222-8222-222222222222",
      user_id: "00000000-0000-4000-8000-000000000001",
      status: "published",
      is_public: true,
      is_confidential: false,
      teaser_title: "Steady SaaS Growth",
      business_name: "Steady SaaS LLC",
      deleted_at: null,
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    this.tables.conversations.push({
      id: "33333333-3333-4333-8333-333333333333",
      listing_id: "22222222-2222-4222-8222-222222222222",
      buyer_id: "00000000-0000-4000-8000-000000000099",
      seller_id: "00000000-0000-4000-8000-000000000001",
      status: "active",
      updated_at: "2026-01-01T00:00:00.000Z",
    });

    this.tables.valuation_reports.push({
      id: "44444444-4444-4444-8444-444444444444",
      user_id: "00000000-0000-4000-8000-000000000001",
      business_id: "11111111-1111-4111-8111-111111111111",
      status: "calculated",
      report_level: "enhanced",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
  }

  public reset() {
    for (const table of Object.keys(this.tables)) {
      this.tables[table] = [];
    }
    this.counters = {};
    this.failpoints = {};
    this.seedBaseFixtures();
  }

  public setFailpoint(op: string, table: string, hits = 1) {
    this.failpoints[`${op}:${table}`] = hits;
  }

  public from(table: string) {
    const state = {
      table,
      filters: [] as Filters,
      orderBy: null as { column: string; ascending: boolean } | null,
      limitCount: null as number | null,
      head: false,
      countExact: false,
      selectColumns: null as string | null,
      op: "select" as "select" | "update",
      updatePatch: null as Row | null,
    };

    const getRows = () => this.tables[table] ?? [];
    const setRows = (rows: Row[]) => {
      this.tables[table] = rows;
    };

    const shouldFail = (opName: string): { message: string } | null => {
      const key = `${opName}:${table}`;
      const left = this.failpoints[key] ?? 0;
      if (left <= 0) return null;
      this.failpoints[key] = left - 1;
      return { message: `forced failure on ${key}` };
    };

    const applyFilters = (rows: Row[]): Row[] => {
      let result = rows;
      for (const f of state.filters) {
        if (f.type === "eq") {
          result = result.filter((row) => row[f.column] === f.value);
        } else if (f.type === "neq") {
          result = result.filter((row) => row[f.column] !== f.value);
        } else if (f.type === "in") {
          const values = Array.isArray(f.value) ? f.value : [];
          result = result.filter((row) => values.includes(row[f.column]));
        } else if (f.type === "contains") {
          const partial = (f.value ?? {}) as Record<string, unknown>;
          result = result.filter((row) => {
            const target = (row[f.column] ?? {}) as Record<string, unknown>;
            return Object.entries(partial).every(([k, v]) => target[k] === v);
          });
        }
      }

      if (state.orderBy) {
        const { column, ascending } = state.orderBy;
        result = [...result].sort((a, b) => {
          const av = a[column];
          const bv = b[column];
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (av < bv) return ascending ? -1 : 1;
          return ascending ? 1 : -1;
        });
      }

      if (state.limitCount != null) {
        result = result.slice(0, state.limitCount);
      }

      return result;
    };

    const executeSelect = () => {
      const rows = applyFilters(getRows());
      if (state.head && state.countExact) {
        return { data: null, count: rows.length, error: null };
      }
      return { data: rows, error: null };
    };

    const selectBuilder = {
      eq(column: string, value: unknown) {
        state.filters.push({ type: "eq", column, value });
        return selectBuilder;
      },
      neq(column: string, value: unknown) {
        state.filters.push({ type: "neq", column, value });
        return selectBuilder;
      },
      in(column: string, value: unknown[]) {
        state.filters.push({ type: "in", column, value });
        return selectBuilder;
      },
      contains(column: string, value: unknown) {
        state.filters.push({ type: "contains", column, value });
        return selectBuilder;
      },
      order(column: string, opts?: { ascending?: boolean }) {
        state.orderBy = { column, ascending: Boolean(opts?.ascending ?? true) };
        return selectBuilder;
      },
      limit(count: number) {
        state.limitCount = count;
        return selectBuilder;
      },
      async maybeSingle() {
        const result = executeSelect();
        const row = (result.data as Row[])[0] ?? null;
        return { data: row, error: null };
      },
      async single() {
        const result = executeSelect();
        const row = (result.data as Row[])[0] ?? null;
        if (!row) {
          return { data: null, error: { message: "No rows" } };
        }
        return { data: row, error: null };
      },
      then(resolve: (value: unknown) => void) {
        resolve(executeSelect());
      },
    };

    const conflictColumns = (onConflict: string | undefined): string[] => {
      if (!onConflict) return [];
      return onConflict.split(",").map((s) => s.trim()).filter(Boolean);
    };

    const nextId = (prefix: string) => {
      this.counters[prefix] = (this.counters[prefix] ?? 0) + 1;
      return `${prefix}_${this.counters[prefix]}`;
    };

    const findConflictIndex = (rows: Row[], candidate: Row, cols: string[]) => {
      if (cols.length === 0) return -1;
      return rows.findIndex((row) => cols.every((c) => row[c] === candidate[c]));
    };

    const mutationSelectBuilder = (row: Row | null, err: { message: string } | null) => ({
      data: row,
      error: err,
      select: (_columns?: string) => ({
        async single() {
          return { data: row, error: err };
        },
        async maybeSingle() {
          return { data: row, error: err };
        },
      }),
    });

    return {
      select(columns?: string, opts?: { head?: boolean; count?: "exact" }) {
        state.selectColumns = columns ?? null;
        state.head = Boolean(opts?.head);
        state.countExact = opts?.count === "exact";
        state.op = "select";
        return selectBuilder;
      },
      upsert(payload: Row, opts?: { onConflict?: string }) {
        const err = shouldFail("upsert");
        if (err) {
          return mutationSelectBuilder(null, err);
        }

        const rows = getRows();
        const now = new Date().toISOString();
        const row = { ...payload } as Row;
        if (!row.id) row.id = nextId(table);
        if (!row.created_at) row.created_at = now;
        if (!row.updated_at) row.updated_at = now;

        const idx = findConflictIndex(rows, row, conflictColumns(opts?.onConflict));
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...row };
        } else {
          rows.push(row);
        }
        setRows(rows);

        const saved = idx >= 0 ? rows[idx] : row;
        return mutationSelectBuilder(saved, null);
      },
      insert(payload: Row | Row[]) {
        const err = shouldFail("insert");
        if (err) {
          return mutationSelectBuilder(null, err);
        }

        const rows = getRows();
        const entries = Array.isArray(payload) ? payload : [payload];
        const now = new Date().toISOString();
        const inserted = entries.map((item) => {
          const next = { ...item } as Row;
          if (!next.id) next.id = nextId(table);
          if (!next.created_at) next.created_at = now;
          if (!next.updated_at) next.updated_at = now;
          rows.push(next);
          return next;
        });
        setRows(rows);
        return mutationSelectBuilder(inserted[0] ?? null, null);
      },
      update(patch: Row) {
        state.op = "update";
        state.updatePatch = patch;

        const updateBuilder = {
          eq(column: string, value: unknown) {
            state.filters.push({ type: "eq", column, value });
            return updateBuilder;
          },
          neq(column: string, value: unknown) {
            state.filters.push({ type: "neq", column, value });
            return updateBuilder;
          },
          in(column: string, value: unknown[]) {
            state.filters.push({ type: "in", column, value });
            return updateBuilder;
          },
          select(_columns?: string) {
            return {
              then: (resolve: (value: unknown) => void) => {
                const err = shouldFail("update");
                if (err) {
                  resolve({ data: null, error: err });
                  return;
                }
                const rows = applyFilters(getRows());
                for (const row of rows) {
                  Object.assign(row, patch);
                }
                resolve({ data: rows, error: null });
              },
            };
          },
          then: (resolve: (value: unknown) => void) => {
            const err = shouldFail("update");
            if (err) {
              resolve({ data: null, error: err });
              return;
            }
            const rows = applyFilters(getRows());
            for (const row of rows) {
              Object.assign(row, patch);
            }
            resolve({ data: rows, error: null });
          },
        };

        return updateBuilder;
      },
    };
  }
}

type ProductCase = {
  key: "enhanced_valuation_report" | "deal_room_90" | "confidential_sale_launch";
  targetType: "business" | "transaction" | "listing";
  targetId: string;
  sessionId: string;
  paymentIntentId: string;
  resourceTable: "paid_valuation_report_deliveries" | "deal_room_paid_access" | "confidential_sale_launches";
  failBeforeEntitlement: { op: string; table: string };
};

const USER_ID = "00000000-0000-4000-8000-000000000001";

function makeCheckoutEvent(args: {
  eventId: string;
  sessionId: string;
  productKey: ProductCase["key"];
  targetType: ProductCase["targetType"];
  targetId: string;
  paymentIntentId: string;
  includeTargetId?: boolean;
  includeTargetType?: boolean;
}) {
  const metadata: Record<string, string> = {
    purchaseType: "one_time_product",
    userId: USER_ID,
    productKey: args.productKey,
    targetType: args.includeTargetType === false ? "" : args.targetType,
    targetId: args.includeTargetId === false ? "" : args.targetId,
    targetSnapshot: JSON.stringify({
      productKey: args.productKey,
      targetType: args.targetType,
      targetId: args.targetId,
    }),
  };

  return {
    id: args.eventId,
    type: "checkout.session.completed",
    created: 1720000000,
    data: {
      object: {
        id: args.sessionId,
        mode: "payment",
        payment_status: "paid",
        payment_intent: args.paymentIntentId,
        customer: "cus_test_123",
        amount_total: 2000,
        currency: "usd",
        metadata,
      },
    },
  };
}

function makeRefundEvent(args: {
  eventId: string;
  paymentIntentId: string;
  amount: number;
  amountRefunded: number;
}) {
  return {
    id: args.eventId,
    type: "charge.refunded",
    created: 1720000001,
    data: {
      object: {
        id: `ch_${args.eventId}`,
        payment_intent: args.paymentIntentId,
        amount: args.amount,
        amount_refunded: args.amountRefunded,
      },
    },
  };
}

describe.each<ProductCase>([
  {
    key: "enhanced_valuation_report",
    targetType: "business",
    targetId: "11111111-1111-4111-8111-111111111111",
    sessionId: "cs_enhanced_1",
    paymentIntentId: "pi_enhanced_1",
    resourceTable: "paid_valuation_report_deliveries",
    failBeforeEntitlement: { op: "upsert", table: "paid_valuation_report_deliveries" },
  },
  {
    key: "deal_room_90",
    targetType: "transaction",
    targetId: "33333333-3333-4333-8333-333333333333",
    sessionId: "cs_deal_1",
    paymentIntentId: "pi_deal_1",
    resourceTable: "deal_room_paid_access",
    failBeforeEntitlement: { op: "insert", table: "deal_rooms" },
  },
  {
    key: "confidential_sale_launch",
    targetType: "listing",
    targetId: "22222222-2222-4222-8222-222222222222",
    sessionId: "cs_conf_1",
    paymentIntentId: "pi_conf_1",
    resourceTable: "confidential_sale_launches",
    failBeforeEntitlement: { op: "upsert", table: "confidential_sale_launches" },
  },
])("Webhook integration matrix: $key", (productCase) => {
  const StripeCtorMock = Stripe as unknown as jest.Mock;
  const createClientMock = createClient as jest.Mock;
  const originalEnv = process.env;

  let db: InMemorySupabaseAdmin;
  let currentEvent: Record<string, unknown>;

  async function runWebhookEvent(event: Record<string, unknown>) {
    currentEvent = event;
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    return POST(
      new Request("https://ownward.example/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid" },
        body: JSON.stringify({}),
      })
    );
  }

  function purchasesForSession() {
    return db.tables.purchases.filter((row) => row.stripe_checkout_session_id === productCase.sessionId);
  }

  function purchaseItemsForPurchase(purchaseId: unknown) {
    return db.tables.purchase_items.filter((row) => row.purchase_id === purchaseId);
  }

  function entitlementsForPurchase(purchaseId: unknown) {
    return db.tables.entitlement_grants.filter((row) => row.purchase_id === purchaseId);
  }

  function resourcesForPurchase(purchaseId: unknown) {
    return db.tables[productCase.resourceTable].filter((row) => row.purchase_id === purchaseId);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

    process.env.STRIPE_PRICE_ENHANCED_VALUATION_REPORT = "price_enhanced_20";
    process.env.STRIPE_PRICE_DEAL_ROOM_90 = "price_deal_room_20";
    process.env.STRIPE_PRICE_CONFIDENTIAL_SALE_LAUNCH = "price_confidential_20";

    db = new InMemorySupabaseAdmin();
    createClientMock.mockReturnValue(db as unknown as ReturnType<typeof createClient>);

    StripeCtorMock.mockImplementation(() => ({
      webhooks: {
        constructEvent: jest.fn(() => currentEvent),
      },
      subscriptions: {
        retrieve: jest.fn(),
      },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("1) first successful checkout.session.completed event", async () => {
    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_1`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(200);
    const purchases = purchasesForSession();
    expect(purchases).toHaveLength(1);
    expect(purchases[0]?.payment_status).toBe("paid");
    expect(purchases[0]?.fulfillment_status).toBe("fulfilled");

    const purchaseId = purchases[0]?.id;
    expect(purchaseItemsForPurchase(purchaseId)).toHaveLength(1);
    expect(resourcesForPurchase(purchaseId)).toHaveLength(1);
    expect(entitlementsForPurchase(purchaseId)).toHaveLength(1);
    expect(entitlementsForPurchase(purchaseId)[0]?.status).toBe("active");
  });

  it("2) exact duplicate event replay", async () => {
    const event = makeCheckoutEvent({
      eventId: `${productCase.sessionId}_evt_dup`,
      sessionId: productCase.sessionId,
      productKey: productCase.key,
      targetType: productCase.targetType,
      targetId: productCase.targetId,
      paymentIntentId: productCase.paymentIntentId,
    });

    const first = await runWebhookEvent(event);
    const second = await runWebhookEvent(event);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });

    const purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(1);
  });

  it("3) different Stripe event ID for the same Checkout Session", async () => {
    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_a`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_b`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(200);
    const purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(1);
    expect(db.tables.stripe_events).toHaveLength(2);
  });

  it("4) purchase already exists but fulfillment is incomplete", async () => {
    db.tables.purchases.push({
      id: "purchase_seed_1",
      user_id: USER_ID,
      product_key: productCase.key,
      stripe_checkout_session_id: productCase.sessionId,
      stripe_payment_intent_id: productCase.paymentIntentId,
      payment_status: "paid",
      fulfillment_status: "pending",
      target_type: productCase.targetType,
      target_id: productCase.targetId,
      created_at: "2026-01-02T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_resume`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(200);
    const purchase = purchasesForSession()[0];
    expect(purchasesForSession()).toHaveLength(1);
    expect(purchase.fulfillment_status).toBe("fulfilled");
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(1);
  });

  it("5) fulfillment fails before entitlement creation", async () => {
    db.setFailpoint(productCase.failBeforeEntitlement.op, productCase.failBeforeEntitlement.table, 1);

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_fail_pre`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(500);
    const purchase = purchasesForSession()[0];
    expect(purchase.fulfillment_status).toBe("failed");
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
  });

  it("6) fulfillment fails after resource is created but before entitlement creation", async () => {
    db.setFailpoint("upsert", "entitlement_grants", 1);

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_fail_ent`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(500);
    const purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id).length).toBeGreaterThan(0);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
    expect(purchase.fulfillment_status).toBe("failed");
  });

  it("7) retry resumes without creating duplicate resources", async () => {
    db.setFailpoint("upsert", "entitlement_grants", 1);

    const first = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_retry_1`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );
    expect(first.status).toBe(500);

    const second = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_retry_2`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(second.status).toBe(200);
    const purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
  });

  it("8) entitlement is created exactly once", async () => {
    db.setFailpoint("upsert", "entitlement_grants", 1);

    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_once_1`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_once_2`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    const purchase = purchasesForSession()[0];
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(1);
  });

  it("9) purchase is marked fulfilled only after resource and entitlement creation", async () => {
    db.setFailpoint("upsert", "entitlement_grants", 1);

    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_order_1`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    let purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id).length).toBeGreaterThan(0);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
    expect(purchase.fulfillment_status).toBe("failed");

    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_order_2`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(1);
    expect(purchase.fulfillment_status).toBe("fulfilled");
  });

  it("10) full refund reversal", async () => {
    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_refund_seed`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    const response = await runWebhookEvent(
      makeRefundEvent({
        eventId: `${productCase.sessionId}_refund_full`,
        paymentIntentId: productCase.paymentIntentId,
        amount: 2000,
        amountRefunded: 2000,
      })
    );

    expect(response.status).toBe(200);
    const purchase = purchasesForSession()[0];
    expect(purchase.payment_status).toBe("refunded");
    expect(purchase.fulfillment_status).toBe("refunded");

    const grants = entitlementsForPurchase(purchase.id);
    expect(grants).toHaveLength(1);
    expect(grants[0]?.status).toBe("revoked");

    if (productCase.key === "enhanced_valuation_report") {
      expect(resourcesForPurchase(purchase.id)[0]?.status).toBe("refunded");
    }
    if (productCase.key === "deal_room_90") {
      expect(resourcesForPurchase(purchase.id)[0]?.access_status).toBe("refunded");
    }
    if (productCase.key === "confidential_sale_launch") {
      expect(resourcesForPurchase(purchase.id)[0]?.status).toBe("refunded");
      const listing = db.tables.business_listings.find((l) => l.id === productCase.targetId);
      expect(listing?.is_confidential).toBe(false);
    }
  });

  it("11) duplicate refund event", async () => {
    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_refund_dup_seed`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    const refundEvent = makeRefundEvent({
      eventId: `${productCase.sessionId}_refund_dup`,
      paymentIntentId: productCase.paymentIntentId,
      amount: 2000,
      amountRefunded: 2000,
    });

    await runWebhookEvent(refundEvent);
    const second = await runWebhookEvent(refundEvent);

    expect(second.status).toBe(200);
    await expect(second.json()).resolves.toMatchObject({ duplicate: true });

    const purchase = purchasesForSession()[0];
    expect(resourcesForPurchase(purchase.id)).toHaveLength(1);
  });

  it("12) partial refund behavior", async () => {
    await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_partial_seed`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    const response = await runWebhookEvent(
      makeRefundEvent({
        eventId: `${productCase.sessionId}_refund_partial`,
        paymentIntentId: productCase.paymentIntentId,
        amount: 2000,
        amountRefunded: 900,
      })
    );

    expect(response.status).toBe(200);
    const purchase = purchasesForSession()[0];
    expect(purchase.payment_status).toBe("paid");
    expect(purchase.fulfillment_status).toBe("fulfilled");
    expect(purchase.failure_code).toBe("partial_refund_manual_review");
  });

  it("13) invalid or missing target metadata", async () => {
    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_no_target`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
        includeTargetId: false,
      })
    );

    expect(response.status).toBe(500);
    const purchase = purchasesForSession()[0];
    expect(purchase.fulfillment_status).toBe("failed");
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
  });

  it("14) target ownership changed between Checkout and fulfillment", async () => {
    if (productCase.key === "enhanced_valuation_report") {
      const business = db.tables.businesses.find((b) => b.id === productCase.targetId);
      if (business) business.owner_id = "00000000-0000-4000-8000-000000000999";
    }
    if (productCase.key === "deal_room_90") {
      const conversation = db.tables.conversations.find((c) => c.id === productCase.targetId);
      if (conversation) conversation.seller_id = "00000000-0000-4000-8000-000000000999";
    }
    if (productCase.key === "confidential_sale_launch") {
      const listing = db.tables.business_listings.find((l) => l.id === productCase.targetId);
      if (listing) listing.user_id = "00000000-0000-4000-8000-000000000999";
    }

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_owner_changed`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    expect(response.status).toBe(500);
    const purchase = purchasesForSession()[0];
    expect(purchase.fulfillment_status).toBe("failed");
    expect(resourcesForPurchase(purchase.id)).toHaveLength(0);
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
  });

  it("15) unknown fulfillment behavior fails closed", async () => {
    const productsModule = await import("@/lib/commerce/products");
    const actualGetProduct = productsModule.getProduct;
    const spy = jest
      .spyOn(productsModule, "getProduct")
      .mockImplementation((key: string) => {
        const product = actualGetProduct(key);
        if (!product || key !== productCase.key) {
          return product;
        }
        return {
          ...product,
          fulfillmentBehavior: "manual_service",
        };
      });

    const response = await runWebhookEvent(
      makeCheckoutEvent({
        eventId: `${productCase.sessionId}_evt_unknown_behavior`,
        sessionId: productCase.sessionId,
        productKey: productCase.key,
        targetType: productCase.targetType,
        targetId: productCase.targetId,
        paymentIntentId: productCase.paymentIntentId,
      })
    );

    spy.mockRestore();

    expect(response.status).toBe(500);
    const purchase = purchasesForSession()[0];
    expect(purchase.fulfillment_status).toBe("failed");
    expect(entitlementsForPurchase(purchase.id)).toHaveLength(0);
  });
});
