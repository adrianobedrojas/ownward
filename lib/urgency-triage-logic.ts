export type TriageAnswer = 'yes' | 'no' | null;

export interface TriageAnswers {
  q1: TriageAnswer;
  q2: TriageAnswer;
  q3: TriageAnswer;
  q4: TriageAnswer;
}

export type TriageOutcome =
  | 'protect'
  | 'preserve'
  | 'create-decision-space'
  | 'schedule';

export interface TriageResult {
  outcome: TriageOutcome;
  appendMessage: 'option-preserving' | 'identify-help';
}

export function computeTriageResult(answers: TriageAnswers): TriageResult | null {
  const { q1, q2, q3, q4 } = answers;

  if (q1 === null || q2 === null || q3 === null || q4 === null) {
    return null;
  }

  let outcome: TriageOutcome;

  if (q1 === 'yes') {
    outcome = 'protect';
  } else if (q2 === 'yes') {
    outcome = 'preserve';
  } else if (q3 === 'yes') {
    outcome = 'create-decision-space';
  } else {
    outcome = 'schedule';
  }

  const appendMessage = q4 === 'yes' ? 'option-preserving' : 'identify-help';

  return { outcome, appendMessage };
}
