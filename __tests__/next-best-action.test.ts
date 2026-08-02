/**
 * Next Best Action Engine Tests
 *
 * Tests every rule and priority in the deterministic NBA rules engine.
 */

import {
  getNextBestAction,
  type LaunchpadInput,
} from "@/lib/launchpad/next-best-action";

const baseInput: LaunchpadInput = {
  businessCount: 1,
  businessCompletion: 80,
  hasHealthAssessment: true,
  milestoneCount: 5,
  documentCount: 5,
  hasValuation: true,
};

describe("getNextBestAction", () => {
  it("Rule 1: returns Create Business when no business exists", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCount: 0,
      businessCompletion: null,
    });
    expect(action.rule).toBe(1);
    expect(action.href).toBe("/business/new");
  });

  it("Rule 2: returns Complete Profile when profile < 50%", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCompletion: 30,
    });
    expect(action.rule).toBe(2);
    expect(action.href).toBe("/business");
    expect(action.description).toContain("30%");
  });

  it("Rule 2 does NOT fire when profile is exactly 50%", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCompletion: 50,
      hasHealthAssessment: false,
    });
    expect(action.rule).toBe(3); // should fall through to rule 3
  });

  it("Rule 3: returns Health Check when no assessment", () => {
    const action = getNextBestAction({
      ...baseInput,
      hasHealthAssessment: false,
    });
    expect(action.rule).toBe(3);
    expect(action.href).toBe("/health");
  });

  it("Rule 4: returns Add Milestone when no milestones", () => {
    const action = getNextBestAction({
      ...baseInput,
      milestoneCount: 0,
    });
    expect(action.rule).toBe(4);
    expect(action.href).toBe("/milestones");
  });

  it("Rule 5: returns Organize Documents when < 3 docs", () => {
    const action = getNextBestAction({
      ...baseInput,
      documentCount: 2,
    });
    expect(action.rule).toBe(5);
    expect(action.href).toBe("/documents");
  });

  it("Rule 5 does NOT fire when exactly 3 docs", () => {
    const action = getNextBestAction({
      ...baseInput,
      documentCount: 3,
      hasValuation: false,
    });
    expect(action.rule).toBe(6);
  });

  it("Rule 6: returns Calculate Value when no valuation", () => {
    const action = getNextBestAction({
      ...baseInput,
      hasValuation: false,
    });
    expect(action.rule).toBe(6);
    expect(action.href).toBe("/valuation");
  });

  it("Rule 7a: returns oldest incomplete milestone when all rules met", () => {
    const action = getNextBestAction({
      ...baseInput,
      oldestIncompleteMilestone: "Register the business",
    });
    expect(action.rule).toBe(7);
    expect(action.description).toContain("Register the business");
    expect(action.href).toBe("/milestones");
  });

  it("Rule 7b: returns lowest health category when no incomplete milestone", () => {
    const action = getNextBestAction({
      ...baseInput,
      oldestIncompleteMilestone: null,
      lowestHealthCategory: "owner_independence",
    });
    expect(action.rule).toBe(7);
    expect(action.description).toContain("owner_independence");
    expect(action.href).toBe("/health");
  });

  it("Rule 7 fallback: returns default message when everything is complete", () => {
    const action = getNextBestAction({
      ...baseInput,
      oldestIncompleteMilestone: null,
      lowestHealthCategory: null,
    });
    expect(action.rule).toBe(7);
    expect(action.href).toBe("/dashboard");
  });

  it("Rule 1 has highest priority over all others", () => {
    const action = getNextBestAction({
      businessCount: 0,
      businessCompletion: null,
      hasHealthAssessment: false,
      milestoneCount: 0,
      documentCount: 0,
      hasValuation: false,
    });
    expect(action.rule).toBe(1);
  });

  it("Start stage with no business returns Build Your Startup Roadmap", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCount: 0,
      businessCompletion: null,
      currentStage: 'start',
    });
    expect(action.rule).toBe(1);
    expect(action.href).toBe('/start');
    expect(action.title).toBe('Build Your Startup Roadmap');
    expect(action.cta).toBe('Start Planning');
  });

  it("Start stage with existing business falls through to normal rules", () => {
    const action = getNextBestAction({
      ...baseInput,
      currentStage: 'start',
      // businessCount > 0, so start-specific rule should not fire
    });
    // Should fall through to rule 7 (all conditions satisfied)
    expect(action.rule).toBe(7);
  });

  it("Non-start stage with no business still returns Create Business Passport", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCount: 0,
      businessCompletion: null,
      currentStage: 'run',
    });
    expect(action.rule).toBe(1);
    expect(action.href).toBe('/business/new');
  });

  it("currentStage undefined (legacy) preserves Create Business Passport behavior", () => {
    const action = getNextBestAction({
      businessCount: 0,
      businessCompletion: null,
      hasHealthAssessment: false,
      milestoneCount: 0,
      documentCount: 0,
      hasValuation: false,
    });
    expect(action.rule).toBe(1);
    expect(action.href).toBe('/business/new');
  });

  it("Rule 2 is checked before Rule 3", () => {
    const action = getNextBestAction({
      ...baseInput,
      businessCompletion: 20,
      hasHealthAssessment: false,
    });
    expect(action.rule).toBe(2);
  });
});
