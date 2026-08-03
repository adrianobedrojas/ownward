/**
 * lib/business-idea-readiness/scoring.ts
 *
 * Pure, deterministic scoring engine for the Business Idea Readiness Check.
 * No I/O — accepts plain answer maps and returns structured score results.
 *
 * DISCLAIMER: This assessment measures preparation based on self-reported
 * answers. It is not a guarantee of business success, nor a professional
 * business or financial evaluation.
 *
 * ── Scoring rules ─────────────────────────────────────────────────────────────
 * • Per-question points: 0–3 (Q11 contributes no points)
 * • Dimension % = Math.round(earned / max * 100), clamped 0–100
 * • Overall = Math.round(mean of 5 dimension percentages), clamped 0–100
 *
 * ── Readiness levels ──────────────────────────────────────────────────────────
 * • 0–24   → idea_discovery
 * • 25–49  → early_validation
 * • 50–74  → test_ready
 * • 75–100 → execution_ready
 *
 * ── Tie-break order for strongest / weakest ──────────────────────────────────
 * Ties are broken by canonical dimension order:
 * problem_clarity → customer_clarity → offer_value → business_model → execution_readiness
 * For "weakest": the first in canonical order that shares the lowest percentage is chosen.
 * For "strongest": the first in canonical order that shares the highest percentage is chosen.
 * This is deterministic and documented.
 */

import { DIMENSIONS } from './types';
import type {
  DimensionId,
  DimensionScore,
  ReadinessLevel,
  ScoreResult,
} from './types';
import { QUESTIONS } from './questions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function dimensionPct(earned: number, max: number): number {
  if (max === 0) return 0;
  return clamp(Math.round((earned / max) * 100), 0, 100);
}

export function readinessLevelFromScore(overall: number): ReadinessLevel {
  if (overall <= 24) return 'idea_discovery';
  if (overall <= 49) return 'early_validation';
  if (overall <= 74) return 'test_ready';
  return 'execution_ready';
}

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Compute dimension and overall scores from a map of question-ID → option-ID.
 *
 * @param answers - Record mapping question IDs to selected option IDs.
 *   Questions with no entry (or an empty string) are treated as 0 points.
 */
export function computeScore(answers: Record<string, string>): ScoreResult {
  // Accumulate earned/max per dimension
  const earned: Record<DimensionId, number> = {
    problem_clarity: 0,
    customer_clarity: 0,
    offer_value: 0,
    business_model: 0,
    execution_readiness: 0,
  };
  const max: Record<DimensionId, number> = {
    problem_clarity: 0,
    customer_clarity: 0,
    offer_value: 0,
    business_model: 0,
    execution_readiness: 0,
  };

  for (const question of QUESTIONS) {
    if (!question.scored) continue;

    max[question.dimension] += question.maxPoints;

    const selectedOptionId = answers[question.id];
    if (!selectedOptionId) continue;

    const option = question.options.find((o) => o.id === selectedOptionId);
    if (option?.points !== undefined) {
      earned[question.dimension] += option.points;
    }
  }

  const dimensionScores: DimensionScore[] = DIMENSIONS.map((id) => ({
    id,
    earnedPoints: earned[id],
    maxPoints: max[id],
    pct: dimensionPct(earned[id], max[id]),
  }));

  // Overall: arithmetic mean of 5 dimension percentages
  const sumPct = dimensionScores.reduce((s, d) => s + d.pct, 0);
  const overall = clamp(Math.round(sumPct / DIMENSIONS.length), 0, 100);

  const level = readinessLevelFromScore(overall);

  // Tie-break: canonical order (DIMENSIONS array order = [0..4])
  // Weakest = lowest pct; ties → first in canonical order
  // Strongest = highest pct; ties → first in canonical order
  // Second-weakest: lowest pct that is not the weakest; ties → first in canonical order
  const sorted = [...dimensionScores].sort((a, b) => {
    if (a.pct !== b.pct) return a.pct - b.pct;
    return DIMENSIONS.indexOf(a.id) - DIMENSIONS.indexOf(b.id);
  });

  const weakestDimension = sorted[0].id;
  const secondWeakestDimension = sorted[1].id;

  const sortedDesc = [...dimensionScores].sort((a, b) => {
    if (b.pct !== a.pct) return b.pct - a.pct;
    return DIMENSIONS.indexOf(a.id) - DIMENSIONS.indexOf(b.id);
  });
  const strongestDimension = sortedDesc[0].id;

  return {
    overall,
    level,
    dimensions: dimensionScores,
    strongestDimension,
    weakestDimension,
    secondWeakestDimension,
  };
}
