/**
 * lib/business-idea-readiness/recommendations.ts
 *
 * Deterministic, rule-based recommendation engine.
 * No AI / external calls — pure functions.
 *
 * Returns exactly 3 unique prioritized actions and 1 immediate seven-day action.
 *
 * Priority:
 * 1. Weakest-dimension action
 * 2. Obstacle override (if obstacle maps to an action different from #1),
 *    otherwise second-weakest dimension action
 * 3. Concrete seven-day execution action (based on weekly time / seven-day answer)
 *
 * Duplicate avoidance: if a candidate key equals an already-selected key, advance
 * to the next candidate in the fallback list.
 */

import type {
  DimensionId,
  RecommendationInput,
  RecommendationResult,
} from './types';

// ─── Dimension → action key mapping ──────────────────────────────────────────

const DIMENSION_ACTION_KEYS: Record<DimensionId, string> = {
  problem_clarity: 'action_clarify_problem',
  customer_clarity: 'action_define_customer',
  offer_value: 'action_validate_offer',
  business_model: 'action_map_revenue',
  execution_readiness: 'action_build_momentum',
};

// ─── Obstacle → action key overrides ─────────────────────────────────────────

const OBSTACLE_ACTION_KEYS: Record<string, string> = {
  not_sure_where_to_start: 'action_start_framework',
  customer_research: 'action_customer_research',
  define_offer: 'action_validate_offer',
  funding: 'action_explore_funding',
  technical_help: 'action_technical_first_step',
  confidence_accountability: 'action_accountability_system',
  organize_idea: 'action_organize_idea',
  other: 'action_next_concrete_step',
};

// ─── Weekly time → immediate action key ──────────────────────────────────────

const WEEKLY_TIME_ACTION_KEYS: Record<string, string> = {
  less_than_2h: 'immediate_minimal_time',
  '2_to_5h': 'immediate_moderate_time',
  '5_to_10h': 'immediate_dedicated_time',
  more_than_10h: 'immediate_full_commitment',
};

// ─── Fallback pool (ordered by generality) ────────────────────────────────────

const FALLBACK_ACTIONS: string[] = [
  'action_clarify_problem',
  'action_define_customer',
  'action_validate_offer',
  'action_map_revenue',
  'action_build_momentum',
  'action_start_framework',
  'action_next_concrete_step',
];

function pickUnique(
  candidates: string[],
  used: Set<string>,
): string {
  for (const key of candidates) {
    if (!used.has(key)) return key;
  }
  // Absolute fallback — cycle through global fallbacks
  for (const key of FALLBACK_ACTIONS) {
    if (!used.has(key)) return key;
  }
  // Should never reach here with 3 actions and 7 fallbacks
  return FALLBACK_ACTIONS[FALLBACK_ACTIONS.length - 1];
}

// ─── Main function ────────────────────────────────────────────────────────────

export function buildRecommendations(
  input: RecommendationInput,
): RecommendationResult {
  const { scores, obstacleAnswer, weeklyTimeAnswer } = input;
  const used = new Set<string>();

  // Priority 1: weakest dimension action
  const action1 = DIMENSION_ACTION_KEYS[scores.weakestDimension];
  used.add(action1);

  // Priority 2: obstacle override or second-weakest dimension action
  const obstacleKey = obstacleAnswer
    ? OBSTACLE_ACTION_KEYS[obstacleAnswer] ?? null
    : null;
  const secondWeakKey = DIMENSION_ACTION_KEYS[scores.secondWeakestDimension];

  const action2Candidate = obstacleKey && !used.has(obstacleKey)
    ? obstacleKey
    : pickUnique(
        [
          secondWeakKey,
          ...Object.values(DIMENSION_ACTION_KEYS).filter((k) => k !== action1),
        ],
        used,
      );
  used.add(action2Candidate);

  // Priority 3: concrete execution action (weekly time / seven-day plan based)
  const timeKey = weeklyTimeAnswer
    ? WEEKLY_TIME_ACTION_KEYS[weeklyTimeAnswer] ?? null
    : null;
  const action3Candidate = timeKey && !used.has(timeKey)
    ? timeKey
    : pickUnique(
        [
          'action_build_momentum',
          'action_next_concrete_step',
          'action_start_framework',
        ],
        used,
      );
  used.add(action3Candidate);

  // Immediate action: derived from weakest dimension (distinct from action1 key style)
  const immediateKey = `immediate_${scores.weakestDimension}`;

  return {
    actions: [
      { key: action1 },
      { key: action2Candidate },
      { key: action3Candidate },
    ],
    immediateAction: { key: immediateKey },
  };
}

// ─── Seven-day plan ───────────────────────────────────────────────────────────

/**
 * Returns a 7-day plan template key based on the weakest dimension and obstacle.
 *
 * The key is used in the SevenDayPlan component to look up localized plan templates.
 * Format: `<dimension>[_<obstacle>][_limited]`
 * The component prepends `sevenDayPlan.` when building the i18n lookup path.
 *
 * Obstacle-specific overrides exist for:
 * - not_sure_where_to_start
 * - customer_research
 * - confidence_accountability
 */
export function buildSevenDayPlanKey(
  weakestDimension: DimensionId,
  obstacleAnswer: string | null,
  weeklyTimeAnswer: string | null,
): string {
  const limitedTime =
    weeklyTimeAnswer === 'less_than_2h' || weeklyTimeAnswer === '2_to_5h';

  const obstacleOverrides = new Set([
    'not_sure_where_to_start',
    'customer_research',
    'confidence_accountability',
  ]);

  if (obstacleAnswer && obstacleOverrides.has(obstacleAnswer)) {
    const suffix = limitedTime ? '_limited' : '';
    return `${weakestDimension}_${obstacleAnswer}${suffix}`;
  }

  const suffix = limitedTime ? '_limited' : '';
  return `${weakestDimension}${suffix}`;
}
