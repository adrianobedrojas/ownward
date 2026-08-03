/**
 * lib/business-idea-readiness/types.ts
 *
 * Shared TypeScript types for the Business Idea Readiness Check.
 * Pure types — no runtime logic.
 */

// ─── Dimensions ───────────────────────────────────────────────────────────────

export const DIMENSIONS = [
  'problem_clarity',
  'customer_clarity',
  'offer_value',
  'business_model',
  'execution_readiness',
] as const;

export type DimensionId = (typeof DIMENSIONS)[number];

// ─── Assessment flow states ───────────────────────────────────────────────────

export type AssessmentStatus = 'intro' | 'in_progress' | 'complete';

// ─── Question / option shapes ─────────────────────────────────────────────────

export interface AssessmentOption {
  /** Stable string ID used for storage and scoring */
  id: string;
  /** Points for this choice (0–3). Absent means no points (diagnostic). */
  points?: number;
}

export interface AssessmentQuestion {
  id: string;
  dimension: DimensionId;
  /** Whether this question contributes to scoring (Q11 does not) */
  scored: boolean;
  /** Maximum points available for this question */
  maxPoints: number;
  options: AssessmentOption[];
}

// ─── Scoring result ───────────────────────────────────────────────────────────

export interface DimensionScore {
  id: DimensionId;
  earnedPoints: number;
  maxPoints: number;
  /** 0–100, rounded, clamped */
  pct: number;
}

export type ReadinessLevel =
  | 'idea_discovery'
  | 'early_validation'
  | 'test_ready'
  | 'execution_ready';

export interface ScoreResult {
  /** 0–100, arithmetic mean of five dimension percentages, rounded, clamped */
  overall: number;
  level: ReadinessLevel;
  dimensions: DimensionScore[];
  strongestDimension: DimensionId;
  weakestDimension: DimensionId;
  secondWeakestDimension: DimensionId;
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export interface RecommendationInput {
  scores: ScoreResult;
  /** Answer to Q11 (obstacle) */
  obstacleAnswer: string | null;
  /** Answer to Q12 (weekly time) */
  weeklyTimeAnswer: string | null;
  /** Answer to Q5 (validation-related: talked to potential customers) */
  validationAnswer: string | null;
  /** Answer to Q6 (seven-day action plan preference) */
  sevenDayActionAnswer: string | null;
}

export interface Recommendation {
  /** i18n key within BusinessIdeaReadiness.recommendations namespace */
  key: string;
}

export interface RecommendationResult {
  /** Exactly 3 unique prioritized actions */
  actions: [Recommendation, Recommendation, Recommendation];
  /** Exactly 1 immediate seven-day action */
  immediateAction: Recommendation;
}

// ─── Seven-day plan ───────────────────────────────────────────────────────────

export interface DayAction {
  day: number;
  /** i18n key within BusinessIdeaReadiness.sevenDayPlan namespace */
  key: string;
}

export interface SevenDayPlan {
  actions: DayAction[];
}

// ─── Storage shape ────────────────────────────────────────────────────────────

export interface BusinessIdeaReadinessStorageState {
  version: 1;
  status: AssessmentStatus;
  currentQuestionIndex: number;
  /** Map from question ID to selected option ID */
  answers: Record<string, string>;
}
