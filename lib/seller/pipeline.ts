/**
 * Seller Pipeline Stages
 *
 * Defines the valid stages for a seller's transaction pipeline.
 *
 * DISCLAIMER: These pipeline stages are for organizational and tracking
 * purposes only. They do not represent legally binding transaction stages,
 * commitments, or guarantees of any kind. Ownward is not a broker, escrow
 * agent, bank, law firm, CPA, certified appraiser, or guarantor.
 */

// ─── Stage definitions ────────────────────────────────────────────────────────

export const SELLER_PIPELINE_STAGES = [
  "preparing",
  "listed",
  "inquiry_received",
  "buyer_qualification",
  "nda_review",
  "due_diligence",
  "offer_received",
  "negotiation",
  "closing_preparation",
  "completed",
  "withdrawn",
] as const;

export type SellerPipelineStage = (typeof SELLER_PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<SellerPipelineStage, string> = {
  preparing: "Preparing",
  listed: "Listed",
  inquiry_received: "Inquiry Received",
  buyer_qualification: "Buyer Qualification",
  nda_review: "NDA / Confidentiality Review",
  due_diligence: "Due Diligence",
  offer_received: "Offer Received",
  negotiation: "Negotiation",
  closing_preparation: "Closing Preparation",
  completed: "Completed",
  withdrawn: "Withdrawn",
};

export const STAGE_DESCRIPTIONS: Record<SellerPipelineStage, string> = {
  preparing: "Preparing business for sale — completing documentation and readiness work.",
  listed: "Business is listed or actively being marketed to buyers.",
  inquiry_received: "One or more buyer inquiries have been received.",
  buyer_qualification: "Evaluating buyer financial and strategic fit.",
  nda_review: "NDA or confidentiality agreement under review with buyer.",
  due_diligence: "Buyer conducting due diligence on business records.",
  offer_received: "Formal offer received from buyer.",
  negotiation: "Negotiating terms with buyer.",
  closing_preparation: "Preparing for closing — legal, financial, and operational steps.",
  completed: "Transaction completed.",
  withdrawn: "Business withdrawn from sale process.",
};

/** Stages that represent an active, ongoing process (not terminal). */
export const ACTIVE_STAGES: SellerPipelineStage[] = [
  "preparing",
  "listed",
  "inquiry_received",
  "buyer_qualification",
  "nda_review",
  "due_diligence",
  "offer_received",
  "negotiation",
  "closing_preparation",
];

/** Terminal stages (no further progression expected). */
export const TERMINAL_STAGES: SellerPipelineStage[] = ["completed", "withdrawn"];

/** Numeric order for progress display. */
export const STAGE_ORDER: Record<SellerPipelineStage, number> = {
  preparing: 0,
  listed: 1,
  inquiry_received: 2,
  buyer_qualification: 3,
  nda_review: 4,
  due_diligence: 5,
  offer_received: 6,
  negotiation: 7,
  closing_preparation: 8,
  completed: 9,
  withdrawn: 9,
};

// ─── Stage validation ─────────────────────────────────────────────────────────

export type StageTransitionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

/**
 * Validates whether a pipeline stage transition is allowed.
 * Allows forward progression and backward movement for corrections.
 * Withdrawals are always allowed from any active stage.
 * Completed and withdrawn are terminal.
 */
export function validateStageTransition(
  from: SellerPipelineStage,
  to: SellerPipelineStage
): StageTransitionResult {
  if (from === to) {
    return { allowed: false, reason: "Already in this stage." };
  }

  if (from === "completed") {
    return {
      allowed: false,
      reason: "Cannot transition from a completed sale. The transaction is finalized.",
    };
  }

  if (to === "withdrawn") {
    return { allowed: true }; // Can withdraw from any active stage
  }

  if (from === "withdrawn") {
    return {
      allowed: false,
      reason: "Cannot transition from a withdrawn process. Create a new opportunity instead.",
    };
  }

  // Allow any other transition (including backward corrections)
  return { allowed: true };
}

// ─── Pipeline opportunity ────────────────────────────────────────────────────

export type SellerOpportunity = {
  id: string;
  businessId: string;
  stage: SellerPipelineStage;
  buyerName: string | null;
  askingPrice: number | null;
  offeredPrice: number | null;
  dealRoomId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Pipeline metrics ─────────────────────────────────────────────────────────

export type PipelineMetrics = {
  totalOpportunities: number;
  activeCount: number;
  completedCount: number;
  withdrawnCount: number;
  avgDaysInPipeline: number | null;
  stageCounts: Record<SellerPipelineStage, number>;
};

export function computePipelineMetrics(
  opportunities: SellerOpportunity[]
): PipelineMetrics {
  const stageCounts = Object.fromEntries(
    SELLER_PIPELINE_STAGES.map((s) => [s, 0])
  ) as Record<SellerPipelineStage, number>;

  for (const opp of opportunities) {
    stageCounts[opp.stage] = (stageCounts[opp.stage] ?? 0) + 1;
  }

  const activeCount = opportunities.filter((o) =>
    ACTIVE_STAGES.includes(o.stage)
  ).length;
  const completedCount = opportunities.filter((o) => o.stage === "completed").length;
  const withdrawnCount = opportunities.filter((o) => o.stage === "withdrawn").length;

  const durations = opportunities
    .filter((o) => TERMINAL_STAGES.includes(o.stage))
    .map((o) => {
      const start = new Date(o.createdAt).getTime();
      const end = new Date(o.updatedAt).getTime();
      return (end - start) / (1000 * 60 * 60 * 24); // days
    })
    .filter((d) => d >= 0);

  const avgDaysInPipeline =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  return {
    totalOpportunities: opportunities.length,
    activeCount,
    completedCount,
    withdrawnCount,
    avgDaysInPipeline,
    stageCounts,
  };
}
