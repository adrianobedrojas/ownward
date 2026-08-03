import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

function makeSupabaseAdminMock(upsertError: { message: string } | null = null) {
  return {
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          upsert: async () => ({ error: upsertError }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }

      return {
        upsert: async () => ({ error: null }),
        update: () => ({ eq: async () => ({ error: null }) }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      };
    },
  };
}

function makeStripeMock() {
  return {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  };
}

describe("Stripe webhook route", () => {
  const StripeCtorMock = Stripe as unknown as jest.Mock;
  const createClientMock = createClient as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("rejects webhook requests without Stripe signature", async () => {
    const stripeMock = makeStripeMock();
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockReturnValue(makeSupabaseAdminMock());

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://ownward.example/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
    expect(stripeMock.webhooks.constructEvent).not.toHaveBeenCalled();
  });

  it("rejects webhook requests with invalid signature", async () => {
    const stripeMock = makeStripeMock();
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("invalid signature");
    });
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockReturnValue(makeSupabaseAdminMock());

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://ownward.example/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "bad" },
        body: "{}",
      })
    );

    expect(response.status).toBe(400);
  });

  it("returns non-2xx when fulfillment processing fails so Stripe retries", async () => {
    const stripeMock = makeStripeMock();
    stripeMock.webhooks.constructEvent.mockReturnValue({
      id: "evt_123",
      type: "checkout.session.completed",
      created: 1,
      data: {
        object: {
          id: "cs_123",
          mode: "payment",
          payment_status: "paid",
          metadata: { purchaseType: "one_time_product", userId: "user-1", productKey: "value_action_sprint" },
          amount_total: 15000,
          currency: "usd",
        },
      },
    });
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockReturnValue(makeSupabaseAdminMock({ message: "db write failed" }));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("https://ownward.example/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "valid" },
        body: "{}",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Webhook handler failed" });
  });
});
