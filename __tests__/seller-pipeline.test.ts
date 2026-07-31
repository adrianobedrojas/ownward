/**
 * Seller Pipeline Tests
 */

import {
  validateStageTransition,
  computePipelineMetrics,
  SELLER_PIPELINE_STAGES,
  STAGE_LABELS,
  ACTIVE_STAGES,
  TERMINAL_STAGES,
  type SellerOpportunity,
  type SellerPipelineStage,
} from "@/lib/seller/pipeline";

describe("SELLER_PIPELINE_STAGES", () => {
  it("has 11 stages", () => {
    expect(SELLER_PIPELINE_STAGES).toHaveLength(11);
  });

  it("includes all required stages", () => {
    const required: SellerPipelineStage[] = [
      "preparing", "listed", "inquiry_received", "buyer_qualification",
      "nda_review", "due_diligence", "offer_received", "negotiation",
      "closing_preparation", "completed", "withdrawn",
    ];
    for (const s of required) {
      expect(SELLER_PIPELINE_STAGES).toContain(s);
    }
  });

  it("has labels for all stages", () => {
    for (const s of SELLER_PIPELINE_STAGES) {
      expect(STAGE_LABELS[s]).toBeTruthy();
    }
  });
});

describe("validateStageTransition", () => {
  it("blocks same-stage transition", () => {
    const result = validateStageTransition("listed", "listed");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.reason).toBeTruthy();
  });

  it("allows forward progression", () => {
    expect(validateStageTransition("preparing", "listed").allowed).toBe(true);
    expect(validateStageTransition("listed", "inquiry_received").allowed).toBe(true);
    expect(validateStageTransition("offer_received", "negotiation").allowed).toBe(true);
  });

  it("allows backward movement (corrections)", () => {
    expect(validateStageTransition("negotiation", "offer_received").allowed).toBe(true);
    expect(validateStageTransition("due_diligence", "inquiry_received").allowed).toBe(true);
  });

  it("allows withdrawal from any active stage", () => {
    for (const stage of ACTIVE_STAGES) {
      expect(validateStageTransition(stage, "withdrawn").allowed).toBe(true);
    }
  });

  it("blocks transition from completed", () => {
    const result = validateStageTransition("completed", "listed");
    expect(result.allowed).toBe(false);
  });

  it("blocks transition from withdrawn", () => {
    const result = validateStageTransition("withdrawn", "listed");
    expect(result.allowed).toBe(false);
  });

  it("allows transition to completed from active stage", () => {
    expect(validateStageTransition("closing_preparation", "completed").allowed).toBe(true);
  });
});

describe("computePipelineMetrics", () => {
  const makeOpp = (
    stage: SellerPipelineStage,
    daysAgo = 10
  ): SellerOpportunity => {
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: Math.random().toString(),
      businessId: "biz-1",
      stage,
      buyerName: null,
      askingPrice: null,
      offeredPrice: null,
      dealRoomId: null,
      notes: null,
      createdAt,
      updatedAt: new Date().toISOString(),
    };
  };

  it("counts total opportunities correctly", () => {
    const opps = [makeOpp("preparing"), makeOpp("listed"), makeOpp("completed")];
    const metrics = computePipelineMetrics(opps);
    expect(metrics.totalOpportunities).toBe(3);
  });

  it("counts active vs terminal stages", () => {
    const opps = [
      makeOpp("preparing"),
      makeOpp("listed"),
      makeOpp("completed"),
      makeOpp("withdrawn"),
    ];
    const metrics = computePipelineMetrics(opps);
    expect(metrics.activeCount).toBe(2);
    expect(metrics.completedCount).toBe(1);
    expect(metrics.withdrawnCount).toBe(1);
  });

  it("stageCounts has entry for every stage", () => {
    const opps = [makeOpp("offer_received"), makeOpp("offer_received"), makeOpp("negotiation")];
    const metrics = computePipelineMetrics(opps);
    expect(metrics.stageCounts.offer_received).toBe(2);
    expect(metrics.stageCounts.negotiation).toBe(1);
    expect(metrics.stageCounts.preparing).toBe(0);
  });

  it("computes avgDaysInPipeline for terminal stages", () => {
    const opps = [makeOpp("completed", 20), makeOpp("withdrawn", 40)];
    const metrics = computePipelineMetrics(opps);
    expect(metrics.avgDaysInPipeline).not.toBeNull();
    if (metrics.avgDaysInPipeline !== null) {
      expect(metrics.avgDaysInPipeline).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns null avgDaysInPipeline when no terminal stages", () => {
    const opps = [makeOpp("preparing"), makeOpp("listed")];
    const metrics = computePipelineMetrics(opps);
    expect(metrics.avgDaysInPipeline).toBeNull();
  });

  it("handles empty list", () => {
    const metrics = computePipelineMetrics([]);
    expect(metrics.totalOpportunities).toBe(0);
    expect(metrics.activeCount).toBe(0);
    expect(metrics.avgDaysInPipeline).toBeNull();
  });
});

describe("ACTIVE_STAGES and TERMINAL_STAGES", () => {
  it("active and terminal stages are mutually exclusive", () => {
    for (const s of ACTIVE_STAGES) {
      expect(TERMINAL_STAGES).not.toContain(s);
    }
  });

  it("completed and withdrawn are terminal", () => {
    expect(TERMINAL_STAGES).toContain("completed");
    expect(TERMINAL_STAGES).toContain("withdrawn");
  });
});
