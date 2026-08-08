import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";
import { canPurchaseBusinessConfiguration } from "@/lib/business-access";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/billing", () => ({
  getUserBillingState: jest.fn(),
}));

jest.mock("@/lib/business-access", () => ({
  canPurchaseBusinessConfiguration: jest.fn(),
}));

type BusinessRow = {
  id: string;
  owner_id: string;
  name: string;
  profile_completion: number;
  deleted_at: string | null;
};

type BusinessMemberRow = {
  business_id: string;
  user_id: string;
  role: string;
  status: string;
};

type SupabaseFixture = {
  userId?: string | null;
  ownedBusinesses?: BusinessRow[];
  memberBusinesses?: BusinessRow[];
  memberships?: BusinessMemberRow[];
};

const AFFECTED_PRODUCTS = [
  "value_action_sprint",
] as const;

function buildSupabaseMock(fixture: SupabaseFixture) {
  const userId = fixture.userId === undefined ? "00000000-0000-4000-8000-000000000001" : fixture.userId;
  const ownedBusinesses = fixture.ownedBusinesses ?? [];
  const memberBusinesses = fixture.memberBusinesses ?? [];
  const memberships = fixture.memberships ?? [];

  return {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "businesses") {
        return {
          select: () => ({
            eq: (column: string, value: string) => {
              if (column !== "owner_id") {
                return {
                  is: () => ({
                    order: async () => ({ data: [], error: null }),
                  }),
                  order: async () => ({ data: [], error: null }),
                };
              }

              const ownerRows = ownedBusinesses.filter((row) => row.owner_id === value);
              return {
                is: (isColumn: string, isValue: null) => ({
                  order: async () => ({
                    data: (() => {
                      void isColumn;
                      void isValue;
                      return ownerRows.filter((row) => row.deleted_at === null);
                    })(),
                    error: null,
                  }),
                }),
                order: async () => ({
                  data: ownerRows,
                  error: null,
                }),
              };
            },
            in: (_column: string, values: string[]) => ({
              is: async (isColumn: string, isValue: null) => ({
                data: memberBusinesses.filter(
                  (row) => {
                    void isColumn;
                    void isValue;
                    return values.includes(row.id) && row.deleted_at === null;
                  },
                ),
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === "business_members") {
        return {
          select: () => ({
            eq: (column: string, value: string) => ({
              eq: async (statusColumn: string, statusValue: string) => {
                const filtered = memberships.filter(
                  (row) =>
                    (column !== "user_id" || row.user_id === value) &&
                    (statusColumn !== "status" || row.status === statusValue),
                );
                return { data: filtered, error: null };
              },
            }),
          }),
        };
      }

      if (table === "business_in_a_box_setups") {
        return {
          select: () => ({
            in: () => ({
              in: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === "purchases") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  in: () => ({
                    in: async () => ({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }

      if (table === "deal_rooms") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ count: 0, error: null }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: [], error: null }),
            in: async () => ({ data: [], error: null }),
          }),
          in: async () => ({ data: [], error: null }),
        }),
      };
    },
  };
}

describe("Commerce business target options", () => {
  const createClientMock = createClient as jest.Mock;
  const getUserBillingStateMock = getUserBillingState as jest.Mock;
  const canPurchaseBusinessConfigurationMock = canPurchaseBusinessConfiguration as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getUserBillingStateMock.mockResolvedValue({
      entitlements: {
        valuationLevel: "basic",
        dealRooms: false,
        activeDealRoomLimit: 0,
        confidentialListings: false,
      },
    });
  });

  async function callTargets(productKey: string, locale = "en") {
    const { GET } = await import("@/app/api/commerce/targets/route");
    return GET(
      new Request(`https://ownward.example/api/commerce/targets?productKey=${productKey}&locale=${locale}`),
    );
  }

  it.each(AFFECTED_PRODUCTS)(
    "returns an eligible owner business option for %s",
    async (productKey) => {
      const ownerBusinessId = "11111111-1111-4111-8111-111111111111";
      createClientMock.mockResolvedValue(
        buildSupabaseMock({
          ownedBusinesses: [
            {
              id: ownerBusinessId,
              owner_id: "00000000-0000-4000-8000-000000000001",
              name: "Owner Business",
              profile_completion: 82,
              deleted_at: null,
            },
          ],
        }),
      );
      canPurchaseBusinessConfigurationMock.mockResolvedValue(true);

      const response = await callTargets(productKey);
      expect(response.status).toBe(200);

      const payload = (await response.json()) as {
        options: Array<{ id: string; label: string; eligible: boolean }>;
      };

      expect(payload.options).toEqual([]);
    },
  );

  it("returns an eligible manager business option when purchase authorization allows it", async () => {
    const businessId = "22222222-2222-4222-8222-222222222222";
    createClientMock.mockResolvedValue(
      buildSupabaseMock({
        memberBusinesses: [
          {
            id: businessId,
            owner_id: "00000000-0000-4000-8000-999999999999",
            name: "Managed Business",
            profile_completion: 70,
            deleted_at: null,
          },
        ],
        memberships: [
          {
            business_id: businessId,
            user_id: "00000000-0000-4000-8000-000000000001",
            role: "manager",
            status: "active",
          },
        ],
      }),
    );
    canPurchaseBusinessConfigurationMock.mockResolvedValue(true);

    const response = await callTargets("value_action_sprint");
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      options: Array<{ id: string; eligible: boolean }>;
    };

    expect(payload.options).toEqual([]);
  });

  it("excludes archived businesses from returned options", async () => {
    const activeBusinessId = "33333333-3333-4333-8333-333333333333";
    const archivedBusinessId = "44444444-4444-4444-8444-444444444444";

    createClientMock.mockResolvedValue(
      buildSupabaseMock({
        ownedBusinesses: [
          {
            id: activeBusinessId,
            owner_id: "00000000-0000-4000-8000-000000000001",
            name: "Active Business",
            profile_completion: 65,
            deleted_at: null,
          },
          {
            id: archivedBusinessId,
            owner_id: "00000000-0000-4000-8000-000000000001",
            name: "Archived Business",
            profile_completion: 40,
            deleted_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    );
    canPurchaseBusinessConfigurationMock.mockResolvedValue(true);

    const response = await callTargets("value_action_sprint");
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      options: Array<{ id: string }>;
    };

    expect(payload.options).toEqual([]);
  });

  it("marks non-owner-or-manager access as ineligible", async () => {
    const businessId = "55555555-5555-4555-8555-555555555555";
    createClientMock.mockResolvedValue(
      buildSupabaseMock({
        memberBusinesses: [
          {
            id: businessId,
            owner_id: "00000000-0000-4000-8000-111111111111",
            name: "Viewer Business",
            profile_completion: 55,
            deleted_at: null,
          },
        ],
        memberships: [
          {
            business_id: businessId,
            user_id: "00000000-0000-4000-8000-000000000001",
            role: "viewer",
            status: "active",
          },
        ],
      }),
    );
    canPurchaseBusinessConfigurationMock.mockResolvedValue(false);

    const response = await callTargets("value_action_sprint");
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      options: Array<{ id: string; eligible: boolean; reason?: string }>;
    };

    expect(payload.options).toEqual([]);
  });

  it("returns 401 for unauthenticated requests", async () => {
    createClientMock.mockResolvedValue(
      buildSupabaseMock({
        userId: null,
      }),
    );
    canPurchaseBusinessConfigurationMock.mockResolvedValue(false);

    const response = await callTargets("value_action_sprint");
    expect(response.status).toBe(401);
  });

  it("returns free-route guidance for non-checkout products", async () => {
    createClientMock.mockResolvedValue(buildSupabaseMock({ ownedBusinesses: [] }));
    getUserBillingStateMock.mockResolvedValue({
      entitlements: {
        valuationLevel: "enhanced",
        dealRooms: false,
        activeDealRoomLimit: 0,
        confidentialListings: false,
      },
    });
    canPurchaseBusinessConfigurationMock.mockResolvedValue(false);

    const response = await callTargets("enhanced_valuation_report", "en");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "This solution does not require checkout targets.",
      route: "/valuation?mode=detailed",
    });
  });

  it("returns target guidance for coming-soon non-checkout products", async () => {
    const ownerBusinessId = "66666666-6666-4666-8666-666666666666";
    createClientMock.mockResolvedValue(
      buildSupabaseMock({
        ownedBusinesses: [
          {
            id: ownerBusinessId,
            owner_id: "00000000-0000-4000-8000-000000000001",
            name: "Template Business",
            profile_completion: 90,
            deleted_at: null,
          },
        ],
      }),
    );
    canPurchaseBusinessConfigurationMock.mockResolvedValue(true);

    const response = await callTargets("business_in_a_box", "en");
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "This solution does not require checkout targets.",
      route: "/solutions/business-in-a-box",
      options: [],
    });
  });
});
