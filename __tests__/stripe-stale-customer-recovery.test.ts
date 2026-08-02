import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("stripe", () => ({
  __esModule: true,
  default: jest.fn(),
}));

type MockState = {
  userId: string;
  email: string;
  profileStripeCustomerId: string | null;
  activeSubscription: { id: string; status: string; price_id: string } | null;
  profileUpdateError: { message: string } | null;
  profileUpsertError: { message: string } | null;
  writes: Array<{ table: string; op: string; payload: unknown; filters: Array<[string, unknown]> }>;
};

type StripeState = {
  retrieveImpl: (customerId: string) => Promise<unknown>;
  createCustomerId: string;
  checkoutUrl: string;
  portalUrl: string;
};

function makeSupabaseMock(state: MockState) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: state.userId, email: state.email } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: state.activeSubscription, error: null }),
                }),
              }),
            }),
          }),
          upsert: async (payload: unknown) => {
            state.writes.push({ table, op: "upsert", payload, filters: [] });
            return { error: null };
          },
          update: (payload: unknown) => ({
            eq: async (column: string, value: unknown) => {
              state.writes.push({ table, op: "update", payload, filters: [[column, value]] });
              return { error: null };
            },
          }),
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => ({
              maybeSingle: async () => ({
                data:
                  column === "id" && value === state.userId
                    ? { stripe_customer_id: state.profileStripeCustomerId }
                    : null,
                error: null,
              }),
            }),
          }),
          update: (payload: unknown) => ({
            eq: (column1: string, value1: unknown) => ({
              eq: async (column2: string, value2: unknown) => {
                state.writes.push({
                  table,
                  op: "update",
                  payload,
                  filters: [
                    [column1, value1],
                    [column2, value2],
                  ],
                });
                return { error: state.profileUpdateError };
              },
            }),
          }),
          upsert: async (payload: unknown) => {
            state.writes.push({ table, op: "upsert", payload, filters: [] });
            return { error: state.profileUpsertError };
          },
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        update: (payload: unknown) => ({
          eq: async (column: string, value: unknown) => {
            state.writes.push({ table, op: "update", payload, filters: [[column, value]] });
            return { error: null };
          },
        }),
        upsert: async (payload: unknown) => {
          state.writes.push({ table, op: "upsert", payload, filters: [] });
          return { error: null };
        },
      };
    },
  };
}

function makeStripeMock(state: StripeState) {
  return {
    customers: {
      retrieve: jest.fn((customerId: string) => state.retrieveImpl(customerId)),
      create: jest.fn(async () => ({ id: state.createCustomerId })),
    },
    checkout: {
      sessions: {
        create: jest.fn(async () => ({ url: state.checkoutUrl })),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(async () => ({ url: state.portalUrl })),
      },
    },
  };
}

describe("Stripe stale-customer recovery", () => {
  const createClientMock = createClient as jest.Mock;
  const StripeCtorMock = Stripe as unknown as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NEXT_PUBLIC_SITE_URL = "https://ownward.example";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_BUILDER = "price_builder";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_annual";
    process.env.STRIPE_PRICE_BUILDER_ANNUAL = "price_builder_annual";
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_annual";
  });

  async function runCheckout(state: MockState, stripeState: StripeState) {
    const stripeMock = makeStripeMock(stripeState);
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockResolvedValue(makeSupabaseMock(state));

    const { POST } = await import("@/app/api/checkout/route");
    const response = await POST(
      new Request("https://ownward.example/api/checkout", {
        method: "POST",
        body: JSON.stringify({ plan: "starter", interval: "monthly" }),
      })
    );

    return { response, stripeMock };
  }

  async function runPortal(state: MockState, stripeState: StripeState) {
    const stripeMock = makeStripeMock(stripeState);
    StripeCtorMock.mockImplementation(() => stripeMock);
    createClientMock.mockResolvedValue(makeSupabaseMock(state));

    const { POST } = await import("@/app/api/billing/portal/route");
    const response = await POST();

    return { response, stripeMock };
  }

  it("preserves a valid existing customer in checkout", async () => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_valid",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: null,
      writes: [],
    };

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => ({ id: "cus_valid", object: "customer" }),
      createCustomerId: "cus_new",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://checkout.stripe.test/session",
    });
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
  });

  it("recovers checkout when Stripe returns a deleted customer", async () => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_obsolete",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: null,
      writes: [],
    };

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => ({ id: "cus_obsolete", deleted: true }),
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    const updateWrite = state.writes.find((w) => w.table === "profiles" && w.op === "update");
    expect(updateWrite?.filters).toEqual([
      ["id", "user-1"],
      ["stripe_customer_id", "cus_obsolete"],
    ]);
    expect(stripeMock.customers.create).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: { userId: "user-1" },
    });
    expect(state.writes).toContainEqual({
      table: "profiles",
      op: "upsert",
      payload: { id: "user-1", stripe_customer_id: "cus_replacement" },
      filters: [],
    });
    expect(state.writes.some((w) => w.table === "subscriptions" && w.op !== "select")).toBe(false);
  });

  it("recovers checkout on Stripe resource_missing customer error", async () => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_obsolete",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: null,
      writes: [],
    };

    const { response } = await runCheckout(state, {
      retrieveImpl: async () => {
        throw {
          type: "StripeInvalidRequestError",
          code: "resource_missing",
          param: "customer",
          message: "No such customer: 'cus_obsolete'",
        };
      },
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    expect(state.writes).toContainEqual({
      table: "profiles",
      op: "upsert",
      payload: { id: "user-1", stripe_customer_id: "cus_replacement" },
      filters: [],
    });
  });

  it("does not classify unrelated Stripe errors as stale-customer in checkout", async () => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_existing",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: null,
      writes: [],
    };

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => {
        throw {
          type: "StripeAuthenticationError",
          message: "Invalid API Key provided",
        };
      },
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to start checkout. Please try again.",
    });
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(state.writes).toEqual([]);
  });

  it("returns a safe error when replacement customer persistence fails", async () => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_obsolete",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: { message: "db write failed" },
      writes: [],
    };

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => ({ id: "cus_obsolete", deleted: true }),
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to update billing profile. Please try again.",
    });
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "deleted customer",
      retrieveImpl: async () => ({ id: "cus_portal_old", deleted: true }),
    },
    {
      name: "resource_missing customer error",
      retrieveImpl: async () => {
        throw {
          type: "StripeInvalidRequestError",
          code: "resource_missing",
          param: "customer",
          message: "No such customer: 'cus_portal_old'",
        };
      },
    },
  ])("returns actionable response for stale customer in billing portal (%s)", async ({ retrieveImpl }) => {
    const state: MockState = {
      userId: "user-1",
      email: "user@example.com",
      profileStripeCustomerId: "cus_portal_old",
      activeSubscription: null,
      profileUpdateError: null,
      profileUpsertError: null,
      writes: [],
    };

    const { response, stripeMock } = await runPortal(state, {
      retrieveImpl,
      createCustomerId: "cus_unused",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "Your previous billing account is no longer available. Please start a new subscription checkout.",
    });
    expect(stripeMock.billingPortal.sessions.create).not.toHaveBeenCalled();
    const updateWrite = state.writes.find((w) => w.table === "profiles" && w.op === "update");
    expect(updateWrite?.filters).toEqual([
      ["id", "user-1"],
      ["stripe_customer_id", "cus_portal_old"],
    ]);
  });
});
