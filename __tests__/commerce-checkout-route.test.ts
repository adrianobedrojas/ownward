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
    jest.resetModules();
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
    const payload = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(payload.success_url).toBe("https://ownward.example/es/account/products?success=purchased");
    expect(payload.cancel_url).toBe("https://ownward.example/es/products/value-action-sprint");
    expect(payload.mode).toBe("payment");
  });

  it("normalizes unsupported locale to default locale", async () => {
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "fr",
    });

    expect(response.status).toBe(200);
    const payload = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(payload.success_url).toBe("https://ownward.example/account/products?success=purchased");
    expect(payload.cancel_url).toBe("https://ownward.example/products/value-action-sprint");
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

  it("ignores client-controlled user, amount, currency, entitlement, and price inputs", async () => {
    const { response, stripeMock } = await runCheckout({
      productKey: "value_action_sprint",
      locale: "en",
      user_id: "attacker",
      amount: 1,
      currency: "eur",
      entitlementType: "admin",
      fulfillmentBehavior: "skip",
      priceId: "price_evil",
    });

    expect(response.status).toBe(200);
    const payload = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(payload.client_reference_id).toBe("user-1");
    expect(payload.line_items).toEqual([{ price: "price_vas_123", quantity: 1 }]);
    expect(payload.metadata.userId).toBe("user-1");
    expect(payload.metadata.productKey).toBe("value_action_sprint");
    expect(payload.metadata.purchaseType).toBe("one_time_product");
  });
});
