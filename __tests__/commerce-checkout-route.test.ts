import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(),
}));

function makeSupabaseMock(userId = "user-1") {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: userId, email: "owner@example.com" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table !== "profiles") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { stripe_customer_id: "cus_existing" }, error: null }),
          }),
        }),
        upsert: async () => ({ error: null }),
      };
    },
  };
}

function makeStripeMock() {
  return {
    customers: {
      retrieve: jest.fn(async () => ({ id: "cus_existing", object: "customer" })),
      create: jest.fn(async () => ({ id: "cus_new" })),
    },
    checkout: {
      sessions: {
        create: jest.fn(async () => ({ url: "https://checkout.stripe.test/session" })),
      },
    },
  };
}

describe("Commerce checkout route", () => {
  const createClientMock = createClient as jest.Mock;
  const StripeCtorMock = Stripe as unknown as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ownward.example";
    process.env.STRIPE_PRICE_VALUE_ACTION_SPRINT = "price_vas_123";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function runCheckout(body: Record<string, unknown>) {
    const stripeMock = makeStripeMock();
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockResolvedValue(makeSupabaseMock());
    const { POST } = await import("@/app/api/commerce/checkout/route");
    const response = await POST(
      new Request("https://ownward.example/api/commerce/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    return { response, stripeMock };
  }

  it("uses locale-aware success and cancel URLs for Spanish", async () => {
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "es",
      success_url: "https://evil.example",
    });

    expect(response.status).toBe(200);
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const payload = (stripeMock.checkout.sessions.create.mock.calls as unknown[][])[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(payload).toBeDefined();
    expect(payload?.success_url).toBe(
      "https://ownward.example/es/account/products?success=purchased"
    );
    expect(payload?.cancel_url).toBe("https://ownward.example/es/products/value-action-sprint");
    expect(payload?.mode).toBe("payment");
  });

  it("normalizes unsupported locale to default locale", async () => {
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "fr",
    });

    expect(response.status).toBe(200);
    const payload = (stripeMock.checkout.sessions.create.mock.calls as unknown[][])[0]?.[0] as
      | Record<string, unknown>
      | undefined;
    expect(payload).toBeDefined();
    expect(payload?.success_url).toBe("https://ownward.example/account/products?success=purchased");
    expect(payload?.cancel_url).toBe("https://ownward.example/products/value-action-sprint");
  });

  it("returns a controlled server error when price config is missing", async () => {
    delete process.env.STRIPE_PRICE_VALUE_ACTION_SPRINT;
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "en",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Product is not configured" });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("ignores client-controlled user, amount, currency, entitlement, price, and redirect inputs", async () => {
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "en",
      user_id: "attacker",
      amount: 1,
      currency: "eur",
      entitlementType: "admin",
      fulfillmentBehavior: "skip",
      priceId: "price_evil",
      success_url: "https://evil.example/success",
      cancel_url: "https://evil.example/cancel",
    });

    expect(response.status).toBe(200);
    const payload = (stripeMock.checkout.sessions.create.mock.calls as unknown[][])[0]?.[0] as
      | {
          client_reference_id?: string;
          line_items?: Array<{ price: string; quantity: number }>;
          success_url?: string;
          cancel_url?: string;
          metadata?: Record<string, string>;
        }
      | undefined;
    expect(payload).toBeDefined();
    expect(payload?.client_reference_id).toBe("user-1");
    expect(payload?.line_items).toEqual([{ price: "price_vas_123", quantity: 1 }]);
    expect(payload?.success_url).toBe(
      "https://ownward.example/account/products?success=purchased"
    );
    expect(payload?.cancel_url).toBe("https://ownward.example/products/value-action-sprint");
    expect(payload?.metadata?.userId).toBe("user-1");
    expect(payload?.metadata?.productKey).toBe("value_action_sprint");
    expect(payload?.metadata?.purchaseType).toBe("one_time_product");
  });

  it("rejects featured_listing checkout when targetId is missing", async () => {
    process.env.STRIPE_PRICE_FEATURED_LISTING = "price_fl_123";
    const { response } = await runCheckout({
      productKey: "featured_listing",
      locale: "en",
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects featured_listing checkout when targetId is not a valid UUID", async () => {
    process.env.STRIPE_PRICE_FEATURED_LISTING = "price_fl_123";
    const { response } = await runCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: "not-a-uuid",
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

// ─── Featured Listing server-side validation ─────────────────────────────────

describe("Featured Listing checkout — server-side validation", () => {
  const createClientMock = createClient as jest.Mock;
  const StripeCtorMock = Stripe as unknown as jest.Mock;
  const originalEnv = process.env;
  const VALID_UUID = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
  const OTHER_USER = "other-user-id";

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ownward.example";
    process.env.STRIPE_PRICE_FEATURED_LISTING = "price_fl_123";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  function makeSupabaseWithListing(listing: Record<string, unknown> | null, userId = "user-1") {
    // A chainable mock builder that returns itself for eq/in/order/limit
    // and resolves to a given data value for maybeSingle/single
    function chainable(resolveData: unknown) {
      const obj: Record<string, unknown> = {
        eq: () => obj,
        in: () => obj,
        order: () => obj,
        limit: () => obj,
        maybeSingle: async () => ({ data: resolveData, error: null }),
        single: async () => ({ data: resolveData, error: null }),
      };
      return obj;
    }

    return {
      auth: {
        getUser: async () => ({
          data: { user: { id: userId, email: "owner@example.com" } },
          error: null,
        }),
      },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => chainable({ stripe_customer_id: "cus_x" }),
            upsert: async () => ({ error: null }),
          };
        }
        if (table === "business_listings") {
          return {
            select: () => chainable(listing),
          };
        }
        // purchases, entitlement_grants, and all other tables → no existing record
        return {
          select: () => chainable(null),
        };
      },
    };
  }

  function makeStripeMock() {
    return {
      customers: {
        retrieve: jest.fn(async () => ({ id: "cus_x", object: "customer" })),
        create: jest.fn(async () => ({ id: "cus_new" })),
      },
      checkout: { sessions: { create: jest.fn(async () => ({ url: "https://checkout.stripe.test/s" })) } },
    };
  }

  async function runFeaturedCheckout(body: Record<string, unknown>, userId = "user-1") {
    const listing = "_listing" in body ? (body._listing as Record<string, unknown> | null) : undefined;
    const stripeMock = makeStripeMock();
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockResolvedValue(
      makeSupabaseWithListing(listing ?? null, userId)
    );
    const { POST } = await import("@/app/api/commerce/checkout/route");
    const { _listing: _removed, ...cleanBody } = body;
    void _removed;
    const response = await POST(
      new Request("https://ownward.example/api/commerce/checkout", {
        method: "POST",
        body: JSON.stringify(cleanBody),
      })
    );
    return { response, stripeMock };
  }

  const goodListing = {
    id: VALID_UUID,
    user_id: "user-1",
    status: "published",
    is_public: true,
    is_confidential: false,
    teaser_title: null,
    business_name: "My Business",
    featured_until: null,
  };

  it("rejects listing owned by another user (403)", async () => {
    const { response } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: { ...goodListing, user_id: OTHER_USER },
    });
    expect(response.status).toBe(403);
  });

  it("rejects unpublished listing (422)", async () => {
    const { response } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: { ...goodListing, status: "draft" },
    });
    expect(response.status).toBe(422);
  });

  it("rejects private listing (422)", async () => {
    const { response } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: { ...goodListing, is_public: false },
    });
    expect(response.status).toBe(422);
  });

  it("rejects already-actively-featured listing (409)", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { response } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: { ...goodListing, featured_until: futureDate },
    });
    expect(response.status).toBe(409);
  });

  it("accepts an eligible published public listing", async () => {
    const { response, stripeMock } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: goodListing,
    });
    expect(response.status).toBe(200);
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  it("rejects listing not found (404)", async () => {
    const { response } = await runFeaturedCheckout({
      productKey: "featured_listing",
      locale: "en",
      targetId: VALID_UUID,
      _listing: null,
    });
    expect(response.status).toBe(404);
  });
});
