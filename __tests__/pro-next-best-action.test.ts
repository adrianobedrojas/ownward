/**
 * Pro Next Best Action Engine Tests
 *
 * Tests all 14 rules in order.
 */

import { getProNextBestAction, type ProNbaInput } from "@/lib/pro/next-best-action";

const BASE_INPUT: ProNbaInput = {
  businessCount: 1,
  activeBusinessId: "biz-1",
  businessCompletion: 80,
  hasSaleReadinessAssessment: true,
  lastReadinessAssessmentAt: new Date().toISOString(),
  oldestEvidenceDaysAgo: 10,
  concentrationRiskLevel: "low",
  valuationRefreshEligible: false,
  lastValuationAt: new Date().toISOString(),
  listingCompletion: 90,
  hasListing: true,
  unansweredInquiryCount: 0,
  qualifiedBuyersWithoutRoomCount: 0,
  overdueDiligenceRequestCount: 0,
  offersAwaitingReviewCount: 0,
  missingCriticalDocCount: 0,
  teamSeatsAvailable: 0,
  hasUnassignedWork: false,
  overdueTaskCount: 0,
  highestPriorityOverdueTask: null,
};

describe("getProNextBestAction", () => {
  it("Rule 1: no businesses → create business", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, businessCount: 0, activeBusinessId: null });
    expect(action.rule).toBe(1);
    expect(action.href).toBe("/business/new");
    expect(action.priority).toBe("critical");
  });

  it("Rule 1: no active business selected", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, activeBusinessId: null });
    expect(action.rule).toBe(1);
    expect(action.href).toBe("/portfolio");
  });

  it("Rule 2: profile < 50% → complete profile", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, businessCompletion: 30 });
    expect(action.rule).toBe(2);
    expect(action.href).toBe("/business");
    expect(action.priority).toBe("critical");
    expect(action.description).toContain("30%");
  });

  it("Rule 2 does NOT fire at exactly 50%", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      businessCompletion: 50,
      hasSaleReadinessAssessment: false,
    });
    expect(action.rule).toBe(3);
  });

  it("Rule 3: no readiness assessment", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, hasSaleReadinessAssessment: false });
    expect(action.rule).toBe(3);
    expect(action.href).toBe("/sale-readiness");
    expect(action.priority).toBe("high");
  });

  it("Rule 4: stale evidence (> 30 days)", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, oldestEvidenceDaysAgo: 45 });
    expect(action.rule).toBe(4);
    expect(action.href).toBe("/sale-readiness");
    expect(action.description).toContain("45");
  });

  it("Rule 4 does NOT fire at exactly 30 days", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      oldestEvidenceDaysAgo: 30,
      concentrationRiskLevel: "critical",
    });
    expect(action.rule).toBe(5);
  });

  it("Rule 5: critical concentration risk", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, concentrationRiskLevel: "critical" });
    expect(action.rule).toBe(5);
    expect(action.href).toBe("/customer-concentration");
    expect(action.priority).toBe("critical");
  });

  it("Rule 5: high concentration risk", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, concentrationRiskLevel: "high" });
    expect(action.rule).toBe(5);
    expect(action.priority).toBe("high");
  });

  it("Rule 6: valuation refresh eligible", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, valuationRefreshEligible: true });
    expect(action.rule).toBe(6);
    expect(action.href).toBe("/valuation");
    expect(action.priority).toBe("medium");
  });

  it("Rule 7: incomplete listing (< 80%)", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, listingCompletion: 50, hasListing: true });
    expect(action.rule).toBe(7);
    expect(action.href).toBe("/sell");
    expect(action.description).toContain("50%");
  });

  it("Rule 7 does NOT fire when hasListing=false", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      hasListing: false,
      listingCompletion: 40,
      unansweredInquiryCount: 1,
    });
    expect(action.rule).toBe(8);
  });

  it("Rule 8: unanswered inquiry", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, unansweredInquiryCount: 3 });
    expect(action.rule).toBe(8);
    expect(action.href).toBe("/messages");
    expect(action.priority).toBe("high");
    expect(action.title).toContain("3");
  });

  it("Rule 9: qualified buyer without deal room", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, qualifiedBuyersWithoutRoomCount: 2 });
    expect(action.rule).toBe(9);
    expect(action.href).toBe("/deals");
  });

  it("Rule 10: overdue diligence request", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, overdueDiligenceRequestCount: 1 });
    expect(action.rule).toBe(10);
    expect(action.href).toBe("/deals");
    expect(action.priority).toBe("high");
  });

  it("Rule 11: offer awaiting review", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, offersAwaitingReviewCount: 1 });
    expect(action.rule).toBe(11);
    expect(action.href).toBe("/seller");
    expect(action.priority).toBe("critical");
  });

  it("Rule 12: missing critical document", () => {
    const action = getProNextBestAction({ ...BASE_INPUT, missingCriticalDocCount: 2 });
    expect(action.rule).toBe(12);
    expect(action.href).toBe("/documents");
    expect(action.priority).toBe("high");
  });

  it("Rule 13: team seat available with unassigned work", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      teamSeatsAvailable: 2,
      hasUnassignedWork: true,
    });
    expect(action.rule).toBe(13);
    expect(action.href).toBe("/team");
    expect(action.description).toContain("2");
  });

  it("Rule 13 does NOT fire when no unassigned work", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      teamSeatsAvailable: 3,
      hasUnassignedWork: false,
      overdueTaskCount: 2,
    });
    expect(action.rule).toBe(14);
  });

  it("Rule 14: overdue task", () => {
    const action = getProNextBestAction({
      ...BASE_INPUT,
      overdueTaskCount: 3,
      highestPriorityOverdueTask: "Gather tax returns",
    });
    expect(action.rule).toBe(14);
    expect(action.href).toBe("/tasks");
    expect(action.title).toContain("Gather tax returns");
  });

  it("Rule 14 default: all clear", () => {
    const action = getProNextBestAction(BASE_INPUT);
    expect(action.rule).toBe(14);
    expect(action.priority).toBe("info");
  });

  it("rules are evaluated in strict priority order", () => {
    // All rules triggered simultaneously — rule 1 should win
    const action = getProNextBestAction({
      ...BASE_INPUT,
      businessCount: 0,
      activeBusinessId: null,
      hasSaleReadinessAssessment: false,
      concentrationRiskLevel: "critical",
      offersAwaitingReviewCount: 5,
    });
    expect(action.rule).toBe(1);
  });
});
