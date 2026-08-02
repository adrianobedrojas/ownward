import {
  computeTriageResult,
  type TriageAnswers,
} from '@/lib/urgency-triage-logic';

describe('computeTriageResult', () => {
  const base: TriageAnswers = { q1: 'no', q2: 'no', q3: 'no', q4: 'no' };

  it('returns null until all questions are answered', () => {
    expect(computeTriageResult({ ...base, q1: null })).toBeNull();
    expect(computeTriageResult({ ...base, q2: null })).toBeNull();
    expect(computeTriageResult({ ...base, q3: null })).toBeNull();
    expect(computeTriageResult({ ...base, q4: null })).toBeNull();
  });

  it('prioritizes protection when q1 is yes', () => {
    expect(computeTriageResult({ q1: 'yes', q2: 'no', q3: 'no', q4: 'no' })).toEqual({
      outcome: 'protect',
      appendMessage: 'identify-help',
    });
  });

  it('prioritizes preserve when q1 is no and q2 is yes', () => {
    expect(computeTriageResult({ q1: 'no', q2: 'yes', q3: 'no', q4: 'no' })).toEqual({
      outcome: 'preserve',
      appendMessage: 'identify-help',
    });
  });

  it('prioritizes decision space when q1 and q2 are no and q3 is yes', () => {
    expect(computeTriageResult({ q1: 'no', q2: 'no', q3: 'yes', q4: 'no' })).toEqual({
      outcome: 'create-decision-space',
      appendMessage: 'identify-help',
    });
  });

  it('falls back to schedule when first three answers are no', () => {
    expect(computeTriageResult(base)).toEqual({
      outcome: 'schedule',
      appendMessage: 'identify-help',
    });
  });

  it('switches the append message when q4 is yes', () => {
    expect(computeTriageResult({ q1: 'no', q2: 'no', q3: 'no', q4: 'yes' })).toEqual({
      outcome: 'schedule',
      appendMessage: 'option-preserving',
    });
  });

  it('keeps outcome precedence independent from q4', () => {
    expect(computeTriageResult({ q1: 'yes', q2: 'yes', q3: 'yes', q4: 'yes' })).toEqual({
      outcome: 'protect',
      appendMessage: 'option-preserving',
    });
    expect(computeTriageResult({ q1: 'no', q2: 'yes', q3: 'yes', q4: 'yes' })).toEqual({
      outcome: 'preserve',
      appendMessage: 'option-preserving',
    });
  });
});
