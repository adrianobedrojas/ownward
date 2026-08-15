import { getValueActionSprintAccess } from "@/lib/commerce/value-action-sprint";

describe("getValueActionSprintAccess", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("grants paid access regardless of trial end date", () => {
    expect(getValueActionSprintAccess("paid", null)).toEqual({
      allowed: true,
      mode: "paid",
      trialEndsAt: null,
      daysRemaining: null,
    });
  });

  it("expires trial when no trial end date is set", () => {
    expect(getValueActionSprintAccess("trial", null)).toEqual({
      allowed: false,
      mode: "expired",
      trialEndsAt: null,
      daysRemaining: 0,
    });
  });

  it("returns trial mode with remaining days for active trial", () => {
    expect(
      getValueActionSprintAccess("trial", "2026-01-03T00:00:00.000Z")
    ).toEqual({
      allowed: true,
      mode: "trial",
      trialEndsAt: "2026-01-03T00:00:00.000Z",
      daysRemaining: 2,
    });
  });
});
