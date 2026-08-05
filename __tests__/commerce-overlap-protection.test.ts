import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/billing", () => ({
  getUserBillingState: jest.fn(),
  isObsoleteStripeCustomer: jest.fn(() => false),
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(),
}));

type MockState = {
  businesses: Array<Record<string, unknown>>;
  conversations: Array<Record<string, unknown>>;
  deal_rooms: Array<Record<string, unknown>>;
  business_listings: Array<Record<string, unknown>>;
  purchases: Array<Record<string, unknown>>;
  entitlement_grants: Array<Record<string, unknown>>;
  paid_valuation_report_deliveries: Array<Record<string, unknown>>;
  confidential_sale_launches: Array<Record<string, unknown>>;
};

function makeSupabaseForCheckout(state: MockState) {
  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "00000000-0000-4000-8000-000000000001",
            email: "owner@example.com",
          },
        },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { stripe_customer_id: "cus_existing" },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: async () => ({ data: [{ stripe_customer_id: null }], error: null }),
              }),
            }),
          }),
          upsert: async () => ({ error: null }),
        };
      }

      if (table === "businesses") {
        return {
          select: () => ({
            eq: (_: string, id: string) => ({
              maybeSingle: async () => ({
                data: state.businesses.find((b) => b.id === id) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "conversations") {
        return {
          select: () => ({
            eq: (_: string, id: string) => ({
              maybeSingle: async () => ({
                data: state.conversations.find((c) => c.id === id) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "deal_rooms") {
        return {
          select: (_cols: string, opts?: { count?: "exact"; head?: boolean }) => {
            if (opts?.head && opts.count === "exact") {
              return {
                eq: () => ({
                  eq: () => Promise.resolve({ count: state.deal_rooms.length, data: null, error: null }),
                }),
              };
            }
            return {
              eq: (_col: string, conversationId: string) => ({
                maybeSingle: async () => ({
                  data: state.deal_rooms.find((r) => r.conversation_id === conversationId) ?? null,
                  error: null,
                }),
              }),
            };
          },
        };
      }

      if (table === "business_listings") {
        return {
          select: () => ({
            eq: (_: string, id: string) => ({
              maybeSingle: async () => ({
                data: state.business_listings.find((l) => l.id === id) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "purchases") {
        return {
          select: () => ({
            eq: (_c1: string, userId: string) => ({
              eq: (_c2: string, productKey: string) => ({
                eq: (_c3: string, targetType: string) => ({
                  eq: (_c4: string, targetId: string) => ({
                    in: () => ({
                      in: () => ({
                        order: () => ({
                          limit: () => ({
                            maybeSingle: async () => ({
                              data:
                                state.purchases.find(
                                  (p) =>
                                    p.user_id === userId &&
                                    p.product_key === productKey &&
                                    p.target_type === targetType &&
                                    p.target_id === targetId
                                ) ?? null,
                              error: null,
                            }),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "entitlement_grants") {
        return {
          select: () => ({
            eq: (_c1: string, userId: string) => ({
              eq: (_c2: string, productKey: string) => ({
                eq: () => ({
                  eq: (_c4: string, targetType: string) => ({
                    eq: (_c5: string, targetId: string) => ({
                      maybeSingle: async () => ({
                        data:
                          state.entitlement_grants.find(
                            (g) =>
                              g.user_id === userId &&
                              g.product_key === productKey &&
                              g.target_type === targetType &&
                              g.target_id === targetId &&
                              g.status === "active"
                          ) ?? null,
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "paid_valuation_report_deliveries") {
        return {
          select: () => ({
            eq: (_c1: string, userId: string) => ({
              eq: (_c2: string, businessId: string) => ({
                in: () => ({
                  maybeSingle: async () => ({
                    data:
                      state.paid_valuation_report_deliveries.find(
                        (d) => d.user_id === userId && d.business_id === businessId
                      ) ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "confidential_sale_launches") {
        return {
          select: () => ({
            eq: (_c1: string, userId: string) => ({
              eq: (_c2: string, listingId: string) => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data:
                      state.confidential_sale_launches.find(
                        (l) => l.user_id === userId && l.listing_id === listingId && l.status === "active"
                      ) ?? null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
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

describe("Commerce overlap protection", () => {
  const createClientMock = createClient as jest.Mock;
  const getUserBillingStateMock = getUserBillingState as jest.Mock;
  const StripeCtorMock = Stripe as unknown as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ownward.example";
    process.env.STRIPE_PRICE_ENHANCED_VALUATION_REPORT = "price_enhanced_20";
    process.env.STRIPE_PRICE_DEAL_ROOM_90 = "price_deal_20";
    process.env.STRIPE_PRICE_CONFIDENTIAL_SALE_LAUNCH = "price_confidential_20";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function callCheckout(body: Record<string, unknown>, state: MockState, billing: Record<string, unknown>) {
    const stripeMock = makeStripeMock();
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockResolvedValue(makeSupabaseForCheckout(state));
    getUserBillingStateMock.mockResolvedValue(billing);

    const { POST } = await import("@/app/api/commerce/checkout/route");
    const response = await POST(
      new Request("https://ownward.example/api/commerce/checkout", {
        method: "POST",
        body: JSON.stringify(body),
      })
    );

    return { response, stripeMock };
  }

  const baseState: MockState = {
    businesses: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        owner_id: "00000000-0000-4000-8000-000000000001",
        deleted_at: null,
        name: "Test Business",
      },
    ],
    conversations: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        listing_id: "22222222-2222-4222-8222-222222222222",
        buyer_id: "00000000-0000-4000-8000-000000000099",
        seller_id: "00000000-0000-4000-8000-000000000001",
        status: "active",
      },
    ],
    deal_rooms: [],
    business_listings: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "00000000-0000-4000-8000-000000000001",
        status: "published",
        is_public: true,
        is_confidential: false,
        teaser_title: "Steady SaaS Growth",
        business_name: "Steady SaaS",
      },
    ],
    purchases: [],
    entitlement_grants: [],
    paid_valuation_report_deliveries: [],
    confidential_sale_launches: [],
  };

  it("blocks Enhanced Valuation checkout for Pro users with included enhanced access", async () => {
    const { response, stripeMock } = await callCheckout(
      {
        productKey: "enhanced_valuation_report",
        locale: "en",
        targetId: "11111111-1111-4111-8111-111111111111",
      },
      { ...baseState },
      {
        entitlements: {
          valuationLevel: "enhanced",
          dealRooms: false,
          activeDealRoomLimit: 0,
          confidentialListings: false,
        },
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Included in your Pro plan. Use the valuation workflow directly.",
      route: "/valuation?mode=detailed",
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("blocks Deal Room 90 checkout when Pro capacity is still available", async () => {
    const { response, stripeMock } = await callCheckout(
      {
        productKey: "deal_room_90",
        locale: "en",
        targetId: "33333333-3333-4333-8333-333333333333",
      },
      { ...baseState, deal_rooms: [{ id: "dr_1" }] },
      {
        entitlements: {
          valuationLevel: "basic",
          dealRooms: true,
          activeDealRoomLimit: 2,
          confidentialListings: false,
        },
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Included in your Pro plan. Use your included Deal Room capacity.",
      route: "/deals",
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("blocks Confidential Sale Launch checkout when confidential listing capability is included", async () => {
    const { response, stripeMock } = await callCheckout(
      {
        productKey: "confidential_sale_launch",
        locale: "en",
        targetId: "22222222-2222-4222-8222-222222222222",
      },
      { ...baseState },
      {
        entitlements: {
          valuationLevel: "basic",
          dealRooms: false,
          activeDealRoomLimit: 0,
          confidentialListings: true,
        },
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "Confidential listing capability is already included in your current plan.",
      route: "/sell/22222222-2222-4222-8222-222222222222/edit",
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate target purchases server-side even if UI is bypassed", async () => {
    const { response, stripeMock } = await callCheckout(
      {
        productKey: "enhanced_valuation_report",
        locale: "en",
        targetId: "11111111-1111-4111-8111-111111111111",
      },
      {
        ...baseState,
        purchases: [
          {
            id: "purchase_open_1",
            user_id: "00000000-0000-4000-8000-000000000001",
            product_key: "enhanced_valuation_report",
            target_type: "business",
            target_id: "11111111-1111-4111-8111-111111111111",
            payment_status: "paid",
            fulfillment_status: "pending",
            fulfilled_resource_type: null,
            fulfilled_resource_id: null,
          },
        ],
      },
      {
        entitlements: {
          valuationLevel: "basic",
          dealRooms: false,
          activeDealRoomLimit: 0,
          confidentialListings: false,
        },
      }
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "A purchase for this target is already pending or active",
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });
});
