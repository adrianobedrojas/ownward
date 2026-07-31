/**
 * Valuation Refresh Tests
 */

import {
  checkValuationRefreshEligibility,
  computeChangeDrivers,
  buildValuationChangeSummary,
} from "@/lib/valuation/refresh";

describe("checkValuationRefreshEligibility", () => {
  it("eligible when no previous refresh", () => {
    const result = checkValuationRefreshEligibility(null);
    expect(result.eligible).toBe(true);
  });

  it("eligible when last refresh > 7 days ago", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = checkValuationRefreshEligibility(eightDaysAgo);
    expect(result.eligible).toBe(true);
  });

  it("not eligible when last refresh was 1 day ago", () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const result = checkValuationRefreshEligibility(oneDayAgo);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.hoursRemaining).toBeGreaterThan(0);
      expect(result.nextRefreshAt).toBeTruthy();
    }
  });

  it("not eligible when last refresh was exactly 7 days ago minus 1 hour", () => {
    const almostSevenDays = new Date(
      Date.now() - (7 * 24 * 60 * 60 * 1000 - 3600 * 1000)
    ).toISOString();
    const result = checkValuationRefreshEligibility(almostSevenDays);
    expect(result.eligible).toBe(false);
    if (!result.eligible) {
      expect(result.hoursRemaining).toBeLessThanOrEqual(2);
    }
  });

  it("eligible exactly at 7-day boundary", () => {
    const exactlySevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();
    const now = new Date(Date.now());
    const result = checkValuationRefreshEligibility(exactlySevenDaysAgo, now);
    expect(result.eligible).toBe(true);
  });

  it("hoursRemaining is a positive integer", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const result = checkValuationRefreshEligibility(threeDaysAgo);
    if (!result.eligible) {
      expect(result.hoursRemaining).toBeGreaterThan(0);
      expect(Number.isInteger(result.hoursRemaining)).toBe(true);
    }
  });
});

describe("computeChangeDrivers", () => {
  it("returns empty array for empty inputs", () => {
    expect(computeChangeDrivers({})).toHaveLength(0);
  });

  it("returns driver for revenue when provided", () => {
    const drivers = computeChangeDrivers({
      revenue: { previous: 1000000, current: 1200000 },
    });
    expect(drivers).toHaveLength(1);
    expect(drivers[0].key).toBe("revenue");
    expect(drivers[0].changeAmount).toBe(200000);
    expect(drivers[0].changePercent).toBeCloseTo(20, 1);
  });

  it("explains increase correctly", () => {
    const drivers = computeChangeDrivers({
      ebitdaMargin: { previous: 15, current: 20 },
    });
    expect(drivers[0].explanation).toContain("increased");
  });

  it("handles null previous gracefully", () => {
    const drivers = computeChangeDrivers({
      marketMultiple: { previous: null, current: 3.5 },
    });
    expect(drivers[0].changeAmount).toBeNull();
    expect(drivers[0].explanation).toContain("Insufficient data");
  });

  it("returns drivers for all provided keys", () => {
    const drivers = computeChangeDrivers({
      revenue: { previous: 1000000, current: 1100000 },
      customerConcentration: { previous: 0.45, current: 0.35 },
      ownerDependence: { previous: 50, current: 40 },
    });
    expect(drivers).toHaveLength(3);
  });
});

describe("buildValuationChangeSummary", () => {
  it("direction is up when current > previous", () => {
    const s = buildValuationChangeSummary(500000, 600000, []);
    expect(s.direction).toBe("up");
    expect(s.changeAmount).toBe(100000);
    expect(s.changePercent).toBeCloseTo(20, 1);
  });

  it("direction is down when current < previous", () => {
    const s = buildValuationChangeSummary(600000, 500000, []);
    expect(s.direction).toBe("down");
    expect(s.changeAmount).toBe(-100000);
  });

  it("direction is flat when unchanged", () => {
    const s = buildValuationChangeSummary(500000, 500000, []);
    expect(s.direction).toBe("flat");
    expect(s.changeAmount).toBe(0);
  });

  it("direction is unknown when either value is null", () => {
    const s = buildValuationChangeSummary(null, 500000, []);
    expect(s.direction).toBe("unknown");
  });

  it("includes currency in summary", () => {
    const s = buildValuationChangeSummary(500000, 600000, []);
    expect(s.summary).toContain("$");
  });
});
