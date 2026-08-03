/**
 * __tests__/business-idea-readiness.test.ts
 *
 * Unit tests for the Business Idea Readiness Check pure logic.
 * No React, no browser — node environment per jest.config.js.
 */

import { QUESTIONS, REQUIRED_QUESTION_IDS, SCORED_QUESTION_IDS } from '@/lib/business-idea-readiness/questions';
import { computeScore, readinessLevelFromScore } from '@/lib/business-idea-readiness/scoring';
import { buildRecommendations, buildSevenDayPlanKey } from '@/lib/business-idea-readiness/recommendations';
import { DIMENSIONS } from '@/lib/business-idea-readiness/types';
import type { RecommendationInput } from '@/lib/business-idea-readiness/types';

// ─── Question definitions ─────────────────────────────────────────────────────

describe('QUESTIONS', () => {
  it('contains exactly 12 questions', () => {
    expect(QUESTIONS).toHaveLength(12);
  });

  it('Q11 is not scored', () => {
    const q11 = QUESTIONS.find((q) => q.id === 'q11');
    expect(q11?.scored).toBe(false);
    expect(q11?.maxPoints).toBe(0);
  });

  it('all scored questions have maxPoints of 3', () => {
    const scored = QUESTIONS.filter((q) => q.scored);
    for (const q of scored) {
      expect(q.maxPoints).toBe(3);
    }
  });

  it('Q11 has exactly the required obstacle option IDs', () => {
    const q11 = QUESTIONS.find((q) => q.id === 'q11');
    const ids = q11?.options.map((o) => o.id);
    expect(ids).toEqual([
      'not_sure_where_to_start',
      'customer_research',
      'define_offer',
      'funding',
      'technical_help',
      'confidence_accountability',
      'organize_idea',
      'other',
    ]);
  });

  it('Q12 has weekly time options', () => {
    const q12 = QUESTIONS.find((q) => q.id === 'q12');
    const ids = q12?.options.map((o) => o.id);
    expect(ids).toContain('less_than_2h');
    expect(ids).toContain('more_than_10h');
  });

  it('REQUIRED_QUESTION_IDS contains all 12 question IDs', () => {
    expect(REQUIRED_QUESTION_IDS).toHaveLength(12);
  });

  it('SCORED_QUESTION_IDS contains 11 questions (all except Q11)', () => {
    expect(SCORED_QUESTION_IDS).toHaveLength(11);
    expect(SCORED_QUESTION_IDS).not.toContain('q11');
  });

  it('all five dimensions are represented', () => {
    const dimensionsUsed = new Set(QUESTIONS.map((q) => q.dimension));
    for (const dim of DIMENSIONS) {
      expect(dimensionsUsed.has(dim)).toBe(true);
    }
  });
});

// ─── readinessLevelFromScore ──────────────────────────────────────────────────

describe('readinessLevelFromScore', () => {
  it('0 → idea_discovery', () => expect(readinessLevelFromScore(0)).toBe('idea_discovery'));
  it('24 → idea_discovery', () => expect(readinessLevelFromScore(24)).toBe('idea_discovery'));
  it('25 → early_validation', () => expect(readinessLevelFromScore(25)).toBe('early_validation'));
  it('49 → early_validation', () => expect(readinessLevelFromScore(49)).toBe('early_validation'));
  it('50 → test_ready', () => expect(readinessLevelFromScore(50)).toBe('test_ready'));
  it('74 → test_ready', () => expect(readinessLevelFromScore(74)).toBe('test_ready'));
  it('75 → execution_ready', () => expect(readinessLevelFromScore(75)).toBe('execution_ready'));
  it('100 → execution_ready', () => expect(readinessLevelFromScore(100)).toBe('execution_ready'));
});

// ─── computeScore ─────────────────────────────────────────────────────────────

function makeAnswers(overrides: Record<string, string> = {}): Record<string, string> {
  const base: Record<string, string> = {};
  for (const q of QUESTIONS) {
    base[q.id] = q.options[0].id; // default: lowest score
  }
  return { ...base, ...overrides };
}

describe('computeScore', () => {
  it('returns 0 overall when all answers are lowest-score options', () => {
    const answers = makeAnswers();
    const result = computeScore(answers);
    expect(result.overall).toBe(0);
    expect(result.level).toBe('idea_discovery');
  });

  it('returns 100 overall when all scored questions have maximum points', () => {
    const maxAnswers: Record<string, string> = {};
    for (const q of QUESTIONS) {
      if (q.scored) {
        // highest point option is the last one for scored Qs
        maxAnswers[q.id] = q.options[q.options.length - 1].id;
      } else {
        maxAnswers[q.id] = q.options[0].id;
      }
    }
    const result = computeScore(maxAnswers);
    expect(result.overall).toBe(100);
    expect(result.level).toBe('execution_ready');
  });

  it('returns 5 dimension scores', () => {
    const result = computeScore(makeAnswers());
    expect(result.dimensions).toHaveLength(5);
  });

  it('dimension percentages are clamped 0–100', () => {
    const result = computeScore(makeAnswers());
    for (const d of result.dimensions) {
      expect(d.pct).toBeGreaterThanOrEqual(0);
      expect(d.pct).toBeLessThanOrEqual(100);
    }
  });

  it('dimension IDs match DIMENSIONS order', () => {
    const result = computeScore(makeAnswers());
    const ids = result.dimensions.map((d) => d.id);
    expect(ids).toEqual([...DIMENSIONS]);
  });

  it('Q11 answers do not affect overall score', () => {
    const withObstacle1 = makeAnswers({ q11: 'funding' });
    const withObstacle2 = makeAnswers({ q11: 'other' });
    expect(computeScore(withObstacle1).overall).toBe(computeScore(withObstacle2).overall);
  });

  it('missing answers are treated as 0 points', () => {
    const result = computeScore({});
    expect(result.overall).toBe(0);
  });

  it('partial answers (only q1) produce non-zero overall only for problem_clarity', () => {
    const result = computeScore({ q1: 'validated' }); // 3 points
    const pc = result.dimensions.find((d) => d.id === 'problem_clarity')!;
    // q1 and q2 both scored; only q1 answered → 3/6 = 50%
    expect(pc.pct).toBe(50);
    // other dimensions should be 0
    const others = result.dimensions.filter((d) => d.id !== 'problem_clarity');
    for (const d of others) {
      expect(d.pct).toBe(0);
    }
  });

  it('overall is the arithmetic mean of 5 dimension percentages, rounded', () => {
    // Force known dimension scores: 100, 0, 0, 0, 0 → mean = 20, rounded = 20
    const answers: Record<string, string> = {};
    for (const q of QUESTIONS) {
      if (q.dimension === 'problem_clarity' && q.scored) {
        answers[q.id] = 'validated'; // 3 pts
      } else {
        answers[q.id] = q.options[0].id; // 0 pts
      }
    }
    const result = computeScore(answers);
    const pcPct = result.dimensions.find((d) => d.id === 'problem_clarity')!.pct;
    expect(pcPct).toBe(100);
    const expectedOverall = Math.round(100 / 5);
    expect(result.overall).toBe(expectedOverall);
  });

  describe('tie-break: weakest dimension', () => {
    it('when all dimensions tied at 0%, weakest is problem_clarity (first in canonical order)', () => {
      const result = computeScore(makeAnswers());
      expect(result.weakestDimension).toBe('problem_clarity');
    });

    it('when all dimensions tied at 100%, strongest is problem_clarity (first in canonical order)', () => {
      const maxAnswers: Record<string, string> = {};
      for (const q of QUESTIONS) {
        maxAnswers[q.id] = q.scored
          ? q.options[q.options.length - 1].id
          : q.options[0].id;
      }
      const result = computeScore(maxAnswers);
      expect(result.strongestDimension).toBe('problem_clarity');
    });

    it('second-weakest is customer_clarity when all tied at 0% (second in canonical order)', () => {
      const result = computeScore(makeAnswers());
      expect(result.secondWeakestDimension).toBe('customer_clarity');
    });
  });

  describe('non-tie scenarios', () => {
    it('correctly identifies the weakest dimension', () => {
      // Give execution_readiness 0%, all others 100%
      const answers: Record<string, string> = {};
      for (const q of QUESTIONS) {
        if (q.dimension === 'execution_readiness' && q.scored) {
          answers[q.id] = q.options[0].id; // 0 pts
        } else if (q.scored) {
          answers[q.id] = q.options[q.options.length - 1].id; // max pts
        } else {
          answers[q.id] = q.options[0].id;
        }
      }
      const result = computeScore(answers);
      expect(result.weakestDimension).toBe('execution_readiness');
      expect(result.strongestDimension).toBe('problem_clarity');
    });
  });
});

// ─── buildRecommendations ────────────────────────────────────────────────────

describe('buildRecommendations', () => {
  function makeInput(overrides: Partial<RecommendationInput> = {}): RecommendationInput {
    const scores = computeScore(makeAnswers());
    return {
      scores,
      obstacleAnswer: null,
      weeklyTimeAnswer: null,
      validationAnswer: null,
      sevenDayActionAnswer: null,
      ...overrides,
    };
  }

  it('returns exactly 3 unique actions', () => {
    const result = buildRecommendations(makeInput());
    expect(result.actions).toHaveLength(3);
    const keys = result.actions.map((a) => a.key);
    expect(new Set(keys).size).toBe(3);
  });

  it('returns exactly 1 immediate action', () => {
    const result = buildRecommendations(makeInput());
    expect(result.immediateAction).toBeDefined();
    expect(typeof result.immediateAction.key).toBe('string');
  });

  it('first action is weakest dimension action', () => {
    const scores = computeScore(makeAnswers());
    const result = buildRecommendations({ scores, obstacleAnswer: null, weeklyTimeAnswer: null, validationAnswer: null, sevenDayActionAnswer: null });
    // All 0% → weakest = problem_clarity → action_clarify_problem
    expect(result.actions[0].key).toBe('action_clarify_problem');
  });

  it('obstacle overrides second action when different from first', () => {
    const scores = computeScore(makeAnswers()); // weakest = problem_clarity
    const result = buildRecommendations({
      scores,
      obstacleAnswer: 'funding', // maps to action_explore_funding
      weeklyTimeAnswer: null,
      validationAnswer: null,
      sevenDayActionAnswer: null,
    });
    expect(result.actions[1].key).toBe('action_explore_funding');
  });

  it('obstacle does not appear as second action if it equals first action', () => {
    // Give problem_clarity 0%, all others max → weakest = problem_clarity → action_clarify_problem
    // Obstacle = not_sure_where_to_start → action_start_framework (different from action_clarify_problem)
    const scores = computeScore(makeAnswers());
    const result = buildRecommendations({
      scores,
      obstacleAnswer: 'not_sure_where_to_start',
      weeklyTimeAnswer: null,
      validationAnswer: null,
      sevenDayActionAnswer: null,
    });
    expect(result.actions[0].key).not.toBe(result.actions[1].key);
    expect(result.actions[1].key).not.toBe(result.actions[2].key);
    expect(result.actions[0].key).not.toBe(result.actions[2].key);
  });

  it('all 3 actions are unique across all combinations', () => {
    const obstacles = ['not_sure_where_to_start', 'funding', null, 'other'];
    const weeklyTimes = ['less_than_2h', 'more_than_10h', null];

    for (const ob of obstacles) {
      for (const wt of weeklyTimes) {
        const scores = computeScore(makeAnswers());
        const result = buildRecommendations({
          scores,
          obstacleAnswer: ob,
          weeklyTimeAnswer: wt,
          validationAnswer: null,
          sevenDayActionAnswer: null,
        });
        const keys = result.actions.map((a) => a.key);
        expect(new Set(keys).size).toBe(3);
      }
    }
  });

  it('immediate action key starts with "immediate_"', () => {
    const result = buildRecommendations(makeInput());
    expect(result.immediateAction.key).toMatch(/^immediate_/);
  });
});

// ─── buildSevenDayPlanKey ─────────────────────────────────────────────────────

describe('buildSevenDayPlanKey', () => {
  it('returns base dimension key when no obstacle or time override', () => {
    const key = buildSevenDayPlanKey('problem_clarity', null, null);
    expect(key).toBe('problem_clarity');
  });

  it('appends _limited when weekly time is limited', () => {
    const key1 = buildSevenDayPlanKey('problem_clarity', null, 'less_than_2h');
    expect(key1).toBe('problem_clarity_limited');

    const key2 = buildSevenDayPlanKey('problem_clarity', null, '2_to_5h');
    expect(key2).toBe('problem_clarity_limited');
  });

  it('does not append _limited for 5_to_10h or more', () => {
    const key = buildSevenDayPlanKey('business_model', null, '5_to_10h');
    expect(key).toBe('business_model');
  });

  it('uses obstacle override when obstacle is in override set', () => {
    const key = buildSevenDayPlanKey('problem_clarity', 'not_sure_where_to_start', null);
    expect(key).toBe('problem_clarity_not_sure_where_to_start');
  });

  it('applies limited suffix to obstacle override when time is limited', () => {
    const key = buildSevenDayPlanKey('problem_clarity', 'not_sure_where_to_start', 'less_than_2h');
    expect(key).toBe('problem_clarity_not_sure_where_to_start_limited');
  });

  it('non-override obstacle falls back to dimension key', () => {
    const key = buildSevenDayPlanKey('offer_value', 'funding', null);
    expect(key).toBe('offer_value');
  });

  it('non-override obstacle with limited time returns dimension_limited', () => {
    const key = buildSevenDayPlanKey('offer_value', 'funding', 'less_than_2h');
    expect(key).toBe('offer_value_limited');
  });

  it('all five dimensions produce valid base keys', () => {
    for (const dim of DIMENSIONS) {
      const key = buildSevenDayPlanKey(dim, null, null);
      expect(key).toBe(dim);
    }
  });
});

// ─── Type safety: DimensionId union ──────────────────────────────────────────

describe('DIMENSIONS constant', () => {
  it('contains exactly 5 dimensions in canonical order', () => {
    expect(DIMENSIONS).toEqual([
      'problem_clarity',
      'customer_clarity',
      'offer_value',
      'business_model',
      'execution_readiness',
    ]);
  });

  it('all question dimension values are valid DimensionId values', () => {
    for (const q of QUESTIONS) {
      expect((DIMENSIONS as readonly string[]).includes(q.dimension)).toBe(true);
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('scoring edge cases', () => {
  it('handles options with no points field as 0 points (Q11)', () => {
    const answers = makeAnswers({ q11: 'not_sure_where_to_start' });
    const result = computeScore(answers);
    // Score should be same as with any other Q11 answer
    const answersAlt = makeAnswers({ q11: 'other' });
    expect(result.overall).toBe(computeScore(answersAlt).overall);
  });

  it('overall is clamped to 0 at minimum', () => {
    const result = computeScore({});
    expect(result.overall).toBeGreaterThanOrEqual(0);
  });

  it('overall is clamped to 100 at maximum', () => {
    const maxAnswers: Record<string, string> = {};
    for (const q of QUESTIONS) {
      maxAnswers[q.id] = q.options[q.options.length - 1].id;
    }
    const result = computeScore(maxAnswers);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('known deterministic score: q1=validated q2=clear all others min → problem_clarity=83%', () => {
    const answers = makeAnswers({ q1: 'validated', q2: 'clear' });
    // q1 = 3 pts, q2 = 2 pts → 5/6 = 83%
    const result = computeScore(answers);
    const pc = result.dimensions.find((d) => d.id === 'problem_clarity')!;
    expect(pc.pct).toBe(83);
  });

  it('weakest and secondWeakest are always different', () => {
    const result = computeScore(makeAnswers());
    expect(result.weakestDimension).not.toBe(result.secondWeakestDimension);
  });

  it('weakest and strongest can be equal only when all dimensions are equal (same pct)', () => {
    // All max answers → all 100% → tie-break → both weakest and strongest = problem_clarity
    const maxAnswers: Record<string, string> = {};
    for (const q of QUESTIONS) {
      maxAnswers[q.id] = q.scored
        ? q.options[q.options.length - 1].id
        : q.options[0].id;
    }
    const result = computeScore(maxAnswers);
    // All dimensions at 100% → both point to first in canonical order
    expect(result.weakestDimension).toBe('problem_clarity');
    expect(result.strongestDimension).toBe('problem_clarity');
  });
});

// ─── Storage key constant ─────────────────────────────────────────────────────

describe('storage', () => {
  it('exports the correct storage key', async () => {
    const { BUSINESS_IDEA_READINESS_STORAGE_KEY, BUSINESS_IDEA_READINESS_STORAGE_VERSION } =
      await import('@/lib/business-idea-readiness/storage');
    expect(BUSINESS_IDEA_READINESS_STORAGE_KEY).toBe('ownward_business_idea_readiness_v1');
    expect(BUSINESS_IDEA_READINESS_STORAGE_VERSION).toBe(1);
  });
});
