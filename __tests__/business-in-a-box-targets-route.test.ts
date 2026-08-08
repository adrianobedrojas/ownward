import { createClient } from "@/lib/supabase/server";
import { getUserBillingState } from "@/lib/billing";

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/billing", () => ({
  getUserBillingState: jest.fn(),
}));

function makeSupabaseMock() {
  const userId = "00000000-0000-4000-8000-000000000001";

  return {
    auth: {
      getUser: async () => ({
        data: { user: { id: userId } },
        error: null,
      }),
    },
    from: (table: string) => {
      if (table === "businesses") {
        return {
          select: () => ({
            eq: () => ({
              is: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "11111111-1111-4111-8111-111111111111",
                      owner_id: userId,
                      name: "Alpha Studio",
                      profile_completion: 80,
                      deleted_at: null,
                    },
                  ],
                  error: null,
                }),
              }),
            }),
            in: () => ({
              is: async () => ({ data: [], error: null }),
            }),
          }),
        };
      }

      if (table === "business_members") {
        return {
          select: () => ({
            eq: () => ({
              eq: async () => ({ data: [], error: null }),
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

describe("Business-in-a-Box targets endpoint", () => {
  const createClientMock = createClient as jest.Mock;
  const getUserBillingStateMock = getUserBillingState as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    createClientMock.mockResolvedValue(makeSupabaseMock());
    getUserBillingStateMock.mockResolvedValue({
      entitlements: {
        valuationLevel: "basic",
        dealRooms: false,
        activeDealRoomLimit: 0,
        confidentialListings: false,
      },
    });
  });

  it("returns safe business labels and approved template summaries", async () => {
    const { GET } = await import("@/app/api/commerce/targets/route");
    const response = await GET(
      new Request("https://ownward.example/api/commerce/targets?productKey=business_in_a_box&locale=en")
    );

    expect(response.status).toBe(409);
    const payload = (await response.json()) as {
      options: Array<{ id: string; label: string; description?: string; eligible: boolean }>;
      error: string;
      route: string;
    };

    expect(payload.error).toBe("This solution does not require checkout targets.");
    expect(payload.route).toBe("/solutions/business-in-a-box");
    expect(payload.options).toEqual([]);
  });
});
