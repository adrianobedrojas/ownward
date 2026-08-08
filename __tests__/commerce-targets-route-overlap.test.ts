import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/billing", () => ({
  getUserBillingState: jest.fn(),
}));

function makeTargetsSupabase(activeRoomCount: number) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "deal_rooms") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ count: activeRoomCount, error: null }),
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

describe("Commerce targets route overlap messaging", () => {
  const createClientMock = createClient as jest.Mock;
  const getUserBillingStateMock = getUserBillingState as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function callTargets(path: string, billing: Record<string, unknown>, activeRoomCount = 0) {
    createClientMock.mockResolvedValue(makeTargetsSupabase(activeRoomCount));
    getUserBillingStateMock.mockResolvedValue(billing);

    const { GET } = await import("@/app/api/commerce/targets/route");
    return GET(new Request(`https://ownward.example${path}`));
  }

  it("returns free-route guidance for enhanced valuation", async () => {
    const response = await callTargets(
      "/api/commerce/targets?productKey=enhanced_valuation_report&locale=en",
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
      error: "This solution does not require checkout targets.",
      route: "/valuation?mode=detailed",
    });
  });

  it("returns Spanish free-route guidance for enhanced valuation", async () => {
    const response = await callTargets(
      "/api/commerce/targets?productKey=enhanced_valuation_report&locale=es",
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
      error: "This solution does not require checkout targets.",
      route: "/valuation?mode=detailed",
    });
  });

  it("routes Deal Room users to included flow when capacity remains", async () => {
    const response = await callTargets(
      "/api/commerce/targets?productKey=deal_room_90&locale=en",
      {
        entitlements: {
          valuationLevel: "basic",
          dealRooms: true,
          activeDealRoomLimit: 2,
          confidentialListings: false,
        },
      },
      1
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      includedMessage: "Included in your Pro plan. Use your included Deal Room capacity.",
      route: "/deals",
    });
  });

  it("returns free-route guidance for confidential listing in Spanish", async () => {
    const response = await callTargets(
      "/api/commerce/targets?productKey=confidential_sale_launch&locale=es",
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
      error: "This solution does not require checkout targets.",
      route: "/sell",
    });
  });
});
