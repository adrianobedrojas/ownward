import { isObsoleteStripeCustomer } from "@/lib/billing";

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

type SelectResult = {
  data: Array<Record<string, unknown>> | null;
  error: { message: string } | null;
};

const mockCreateClient = jest.fn();
const mockGetSiteUrl = jest.fn(() => "https://example.com");

const mockCustomersRetrieve = jest.fn();
const mockCustomersCreate = jest.fn();
const mockCheckoutSessionsCreate = jest.fn();
const mockBillingPortalSessionsCreate = jest.fn();
const mockConsoleError = jest.spyOn(console, "error").mockImplementation(() => {
  // Silence expected error logging during failure-path tests.
});

jest.mock("@/lib/supabase/server", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock("@/lib/config", () => ({
  getSiteUrl: () => mockGetSiteUrl(),
}));

jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      retrieve: mockCustomersRetrieve,
      create: mockCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: mockBillingPortalSessionsCreate,
      },
    },
  }));
});

function createSupabaseMock(options?: {
  userId?: string;
  email?: string;
  authError?: { message: string } | null;
  subscriptionMaybeSingle?: MaybeSingleResult[];
  profileMaybeSingle?: MaybeSingleResult[];
  profileUpdateSelect?: SelectResult[];
  profileUpsert?: { error: { message: string } | null }[];
}) {
  const userId = options?.userId ?? "user_123";
  const email = options?.email ?? "owner@example.com";

  const subscriptionMaybeSingle = [...(options?.subscriptionMaybeSingle ?? [{ data: null, error: null }])];
  const profileMaybeSingle = [...(options?.profileMaybeSingle ?? [{ data: null, error: null }])];
  const profileUpdateSelect = [...(options?.profileUpdateSelect ?? [{ data: [{ id: userId }], error: null }])];
  const profileUpsert = [...(options?.profileUpsert ?? [{ error: null }])];

  let profileInUpdateMode = false;

  const subscriptionsBuilder = {
    select: jest.fn(() => subscriptionsBuilder),
    eq: jest.fn(() => subscriptionsBuilder),
    order: jest.fn(() => subscriptionsBuilder),
    limit: jest.fn(() => subscriptionsBuilder),
    maybeSingle: jest.fn(async () => subscriptionMaybeSingle.shift() ?? { data: null, error: null }),
  };

  const profilesBuilder = {
    select: jest.fn(() => {
      if (profileInUpdateMode) {
        profileInUpdateMode = false;
        return Promise.resolve(profileUpdateSelect.shift() ?? { data: [], error: null });
      }
      return profilesBuilder;
    }),
    eq: jest.fn(() => profilesBuilder),
    order: jest.fn(() => profilesBuilder),
    limit: jest.fn(() => profilesBuilder),
    is: jest.fn(() => profilesBuilder),
    maybeSingle: jest.fn(async () => profileMaybeSingle.shift() ?? { data: null, error: null }),
    update: jest.fn(() => {
      profileInUpdateMode = true;
      return profilesBuilder;
    }),
    upsert: jest.fn(async () => profileUpsert.shift() ?? { error: null }),
  };

  const client = {
    auth: {
      getUser: jest.fn(async () => ({
        data: {
          user: options?.authError
            ? null
            : {
                id: userId,
                email,
              },
        },
        error: options?.authError ?? null,
      })),
    },
    from: jest.fn((table: string) => {
      if (table === "subscriptions") {
        return subscriptionsBuilder;
      }
      if (table === "profiles") {
        return profilesBuilder;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    client,
    profilesBuilder,
  };
}

function buildCheckoutRequest() {
  return new Request("https://example.com/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ plan: "starter", interval: "monthly" }),
  });
}

describe("stale Stripe customer recovery", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_STARTER = "price_starter";
    process.env.STRIPE_PRICE_BUILDER = "price_builder";
    process.env.STRIPE_PRICE_PRO = "price_pro";
    process.env.STRIPE_PRICE_STARTER_ANNUAL = "price_starter_annual";
    process.env.STRIPE_PRICE_BUILDER_ANNUAL = "price_builder_annual";
    process.env.STRIPE_PRICE_PRO_ANNUAL = "price_pro_annual";
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it("checkout recovers when Stripe error uses param=id", async () => {
    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: "cus_stale" }, error: null }],
      profileUpdateSelect: [
        { data: [{ id: "user_123" }], error: null },
        { data: [{ id: "user_123" }], error: null },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "resource_missing",
      param: "id",
      message: "No such customer: 'cus_stale'",
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.example/session" });

    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(buildCheckoutRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.example/session");
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new" })
    );
  });

  it("checkout recovers when Stripe error uses param=customer", async () => {
    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: "cus_stale" }, error: null }],
      profileUpdateSelect: [
        { data: [{ id: "user_123" }], error: null },
        { data: [{ id: "user_123" }], error: null },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "resource_missing",
      param: "customer",
      message: "No such customer: 'cus_stale'",
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new_2" });
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.example/session-2" });

    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(buildCheckoutRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.example/session-2");
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_new_2" })
    );
  });

  it("billing portal recovers when Stripe error uses param=id", async () => {
    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: "cus_stale" }, error: null }],
      profileUpdateSelect: [
        { data: [{ id: "user_123" }], error: null },
        { data: [{ id: "user_123" }], error: null },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "resource_missing",
      param: "id",
      message: "No such customer: 'cus_stale'",
    });
    mockCustomersCreate.mockResolvedValue({ id: "cus_portal_new" });
    mockBillingPortalSessionsCreate.mockResolvedValue({ url: "https://billing.example/portal" });

    const { POST } = await import("@/app/api/billing/portal/route");
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://billing.example/portal");
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
    expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_portal_new" })
    );
  });

  it("treats deleted Stripe customer objects as obsolete", () => {
    expect(isObsoleteStripeCustomer({ deleted: true })).toBe(true);
  });

  it("does not treat 'No such price' as obsolete customer", async () => {
    const sensitiveMessage = "TEST_SENSITIVE_PRICE_FAILURE_no_such_price_987";
    const staleCustomerId = "cus_sensitive_checkout_price";

    expect(
      isObsoleteStripeCustomer({
        code: "resource_missing",
        param: "id",
        message: "No such price: 'price_123'",
      })
    ).toBe(false);

    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: staleCustomerId }, error: null }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "resource_missing",
      param: "id",
      message: sensitiveMessage,
    });

    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(buildCheckoutRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Unable to start checkout. Please try again.");
    expect(body.error).not.toContain(sensitiveMessage);
    expect(body.error).not.toContain(staleCustomerId);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(supabase.profilesBuilder.update).not.toHaveBeenCalled();
    expect(supabase.profilesBuilder.upsert).not.toHaveBeenCalled();
  });

  it("does not clear customer id for unrelated Stripe errors", async () => {
    const sensitiveMessage = "TEST_SENSITIVE_STRIPE_INTERNAL_TIMEOUT_654";
    const staleCustomerId = "cus_sensitive_checkout_unrelated";

    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: staleCustomerId }, error: null }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "api_error",
      param: "customer",
      message: sensitiveMessage,
    });

    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(buildCheckoutRequest());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Unable to start checkout. Please try again.");
    expect(body.error).not.toContain(sensitiveMessage);
    expect(body.error).not.toContain(staleCustomerId);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(supabase.profilesBuilder.update).not.toHaveBeenCalled();
    expect(supabase.profilesBuilder.upsert).not.toHaveBeenCalled();
  });

  it("billing portal unexpected errors return a fixed safe message", async () => {
    const sensitiveMessage = "TEST_SENSITIVE_PORTAL_INTERNAL_321";
    const staleCustomerId = "cus_sensitive_portal";

    const supabase = createSupabaseMock({
      profileMaybeSingle: [{ data: { stripe_customer_id: staleCustomerId }, error: null }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "api_error",
      param: "customer",
      message: sensitiveMessage,
    });

    const { POST } = await import("@/app/api/billing/portal/route");
    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Unable to open the billing portal. Please try again.");
    expect(body.error).not.toContain(sensitiveMessage);
    expect(body.error).not.toContain(staleCustomerId);
    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it("zero-row guarded update uses newer id and avoids duplicate customer creation", async () => {
    const supabase = createSupabaseMock({
      profileMaybeSingle: [
        { data: { stripe_customer_id: "cus_stale" }, error: null },
        { data: { stripe_customer_id: "cus_newer" }, error: null },
      ],
      profileUpdateSelect: [{ data: [], error: null }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    mockCustomersRetrieve.mockRejectedValue({
      code: "resource_missing",
      param: "customer",
      message: "No such customer: 'cus_stale'",
    });
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.example/concurrent" });

    const { POST } = await import("@/app/api/checkout/route");
    const res = await POST(buildCheckoutRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.url).toBe("https://checkout.example/concurrent");
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_newer" })
    );
    expect(supabase.profilesBuilder.update).toHaveBeenCalledTimes(1);
  });
});
