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
  profileStripeCustomerIdReads?: Array<string | null>;
  profileGuardedUpdateMatches?: number;
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

function readProfileStripeCustomerId(state: MockState) {
  if (state.profileStripeCustomerIdReads?.length) {
    return state.profileStripeCustomerIdReads.shift() ?? null;
  }

  return state.profileStripeCustomerId;
}

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
        };
      }

      if (table === "profiles") {
        return {
          select: () => ({
            eq: (column: string, value: unknown) => ({
              maybeSingle: async () => ({
                data:
                  column === "id" && value === state.userId
                    ? { stripe_customer_id: readProfileStripeCustomerId(state) }
                    : null,
                error: null,
              }),
            }),
          }),
          update: (payload: unknown) => ({
            eq: (column1: string, value1: unknown) => ({
              eq: (column2: string, value2: unknown) => ({
                select: async () => {
                  state.writes.push({
                    table,
                    op: "update",
                    payload,
                    filters: [
                      [column1, value1],
                      [column2, value2],
                    ],
                  });

                  if (state.profileUpdateError) {
                    return { data: null, error: state.profileUpdateError };
                  }

                  const matchedRows = state.profileGuardedUpdateMatches ?? 1;
                  if (
                    matchedRows > 0 &&
                    column1 === "id" &&
                    value1 === state.userId &&
                    column2 === "stripe_customer_id" &&
                    payload &&
                    typeof payload === "object" &&
                    "stripe_customer_id" in payload
                  ) {
                    state.profileStripeCustomerId =
                      (payload as { stripe_customer_id: string | null }).stripe_customer_id;
                  }

                  return {
                    data: Array.from({ length: matchedRows }, () => ({
                      stripe_customer_id: null,
                    })),
                    error: null,
                  };
                },
              }),
            }),
          }),
          upsert: async (payload: unknown) => {
            state.writes.push({ table, op: "upsert", payload, filters: [] });
            if (
              payload &&
              typeof payload === "object" &&
              "stripe_customer_id" in payload
            ) {
              state.profileStripeCustomerId =
                (payload as { stripe_customer_id: string | null }).stripe_customer_id;
            }
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

function makeState(overrides: Partial<MockState> = {}): MockState {
  return {
    userId: "user-1",
    email: "user@example.com",
    profileStripeCustomerId: null,
    activeSubscription: null,
    profileUpdateError: null,
    profileUpsertError: null,
    writes: [],
    ...overrides,
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
    const state = makeState({ profileStripeCustomerId: "cus_valid" });

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

  it("recovers checkout when Stripe returns a deleted customer object", async () => {
    const state = makeState({ profileStripeCustomerId: "cus_obsolete" });

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => ({ id: "cus_obsolete", deleted: true }),
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    expect(state.writes).toContainEqual({
      table: "profiles",
      op: "update",
      payload: { stripe_customer_id: null },
      filters: [
        ["id", "user-1"],
        ["stripe_customer_id", "cus_obsolete"],
      ],
    });
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
  });

  it.each(["id", "customer"] as const)(
    "recovers checkout on Stripe resource_missing customer error with param %s",
    async (param) => {
      const state = makeState({ profileStripeCustomerId: "cus_obsolete" });

      const { response, stripeMock } = await runCheckout(state, {
        retrieveImpl: async () => {
          throw {
            type: "StripeInvalidRequestError",
            code: "resource_missing",
            param,
            message: "No such customer: 'cus_obsolete'",
          };
        },
        createCustomerId: "cus_replacement",
        checkoutUrl: "https://checkout.stripe.test/session",
        portalUrl: "https://portal.stripe.test/session",
      });

      expect(response.status).toBe(200);
      expect(stripeMock.customers.create).toHaveBeenCalledTimes(1);
      expect(state.writes).toContainEqual({
        table: "profiles",
        op: "upsert",
        payload: { id: "user-1", stripe_customer_id: "cus_replacement" },
        filters: [],
      });
    }
  );

  it("does not classify a missing price as a missing customer", async () => {
    const state = makeState({ profileStripeCustomerId: "cus_existing" });

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => {
        throw {
          type: "StripeInvalidRequestError",
          code: "resource_missing",
          param: "id",
          message: "No such price: 'price_missing'",
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

  it("does not classify unrelated Stripe errors as stale-customer in checkout", async () => {
    const state = makeState({ profileStripeCustomerId: "cus_existing" });

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

  it("does not overwrite a newer customer id or create a duplicate customer after a guarded checkout update misses", async () => {
    const state = makeState({
      profileStripeCustomerId: "cus_obsolete",
      profileStripeCustomerIdReads: ["cus_obsolete", "cus_current"],
      profileGuardedUpdateMatches: 0,
    });

    const { response, stripeMock } = await runCheckout(state, {
      retrieveImpl: async () => ({ id: "cus_obsolete", deleted: true }),
      createCustomerId: "cus_replacement",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_current" })
    );
    expect(state.writes).toEqual([
      {
        table: "profiles",
        op: "update",
        payload: { stripe_customer_id: null },
        filters: [
          ["id", "user-1"],
          ["stripe_customer_id", "cus_obsolete"],
        ],
      },
    ]);
  });

  it("returns a safe error when replacement customer persistence fails", async () => {
    const state = makeState({
      profileStripeCustomerId: "cus_obsolete",
      profileUpsertError: { message: "db write failed" },
    });

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

  it("returns actionable response for a deleted customer object in billing portal", async () => {
    const state = makeState({ profileStripeCustomerId: "cus_portal_old" });

    const { response, stripeMock } = await runPortal(state, {
      retrieveImpl: async () => ({ id: "cus_portal_old", deleted: true }),
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
    expect(state.writes).toContainEqual({
      table: "profiles",
      op: "update",
      payload: { stripe_customer_id: null },
      filters: [
        ["id", "user-1"],
        ["stripe_customer_id", "cus_portal_old"],
      ],
    });
  });

  it("recovers billing portal when a concurrent request already replaced the stale customer", async () => {
    const state = makeState({
      profileStripeCustomerId: "cus_portal_old",
      profileStripeCustomerIdReads: ["cus_portal_old", "cus_portal_current"],
      profileGuardedUpdateMatches: 0,
    });

    const { response, stripeMock } = await runPortal(state, {
      retrieveImpl: async () => ({ id: "cus_portal_old", deleted: true }),
      createCustomerId: "cus_unused",
      checkoutUrl: "https://checkout.stripe.test/session",
      portalUrl: "https://portal.stripe.test/session",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      url: "https://portal.stripe.test/session",
    });
    expect(stripeMock.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_portal_current",
      return_url: "https://ownward.example/dashboard",
    });
  });

  it("recovers billing portal on Stripe resource_missing customer error with param id", async () => {
    const state = makeState({ profileStripeCustomerId: "cus_portal_old" });

    const { response, stripeMock } = await runPortal(state, {
      retrieveImpl: async () => {
        throw {
          type: "StripeInvalidRequestError",
          code: "resource_missing",
          param: "id",
          message: "No such customer: 'cus_portal_old'",
        };
      },
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
    expect(state.writes).toContainEqual({
      table: "profiles",
      op: "update",
      payload: { stripe_customer_id: null },
      filters: [
        ["id", "user-1"],
        ["stripe_customer_id", "cus_portal_old"],
      ],
    });
  });
});
