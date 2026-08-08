/**
 * Tests for lib/start-business.ts
 */

import {
  startBusinessSteps,
  getDefaultPlan,
  getPlanProgress,
  getAllPlanFieldIds,
  countFilledFields,
  parsePlanFromStorage,
  exportPlanAsText,
  exportPlanAsJson,
  START_BUSINESS_STORAGE_KEY,
  START_BUSINESS_STORAGE_VERSION,
  type StartBusinessPlan,
} from '@/lib/start-business';

// ─── Step definitions ─────────────────────────────────────────────────────────

describe('startBusinessSteps', () => {
  it('all step IDs are unique', () => {
    const ids = startBusinessSteps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all field IDs within each step are unique', () => {
    for (const step of startBusinessSteps) {
      const ids = step.fields.map((f) => f.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('all step numbers are sequential starting at 1', () => {
    for (let i = 0; i < startBusinessSteps.length; i++) {
      expect(startBusinessSteps[i].stepNumber).toBe(i + 1);
    }
  });

  it('every step has an English title and Spanish title', () => {
    for (const step of startBusinessSteps) {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
      expect(typeof step.titleEs).toBe('string');
      expect(step.titleEs.length).toBeGreaterThan(0);
    }
  });

  it('every field has a label and labelEs', () => {
    for (const step of startBusinessSteps) {
      for (const field of step.fields) {
        expect(typeof field.label).toBe('string');
        expect(field.label.length).toBeGreaterThan(0);
        expect(typeof field.labelEs).toBe('string');
        expect(field.labelEs.length).toBeGreaterThan(0);
      }
    }
  });

  it('all field IDs are unique across all steps when qualified', () => {
    const qualified = getAllPlanFieldIds();
    expect(new Set(qualified).size).toBe(qualified.length);
  });
});

// ─── Default plan ─────────────────────────────────────────────────────────────

describe('getDefaultPlan', () => {
  it('returns a plan with the correct version', () => {
    const plan = getDefaultPlan();
    expect(plan._version).toBe(START_BUSINESS_STORAGE_VERSION);
  });

  it('returns a plan with all steps present', () => {
    const plan = getDefaultPlan();
    for (const step of startBusinessSteps) {
      expect(plan).toHaveProperty(step.id);
    }
  });

  it('all fields in the default plan are empty strings', () => {
    const plan = getDefaultPlan();
    for (const step of startBusinessSteps) {
      const stepData = plan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
      for (const field of step.fields) {
        expect(stepData[field.id]).toBe('');
      }
    }
  });
});

// ─── Progress ─────────────────────────────────────────────────────────────────

describe('getPlanProgress', () => {
  it('returns 0 when no fields are filled', () => {
    const plan = getDefaultPlan();
    expect(getPlanProgress(plan)).toBe(0);
  });

  it('returns 100 when all fields are filled', () => {
    const plan = getDefaultPlan();
    for (const step of startBusinessSteps) {
      const stepData = plan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>;
      for (const field of step.fields) {
        stepData[field.id] = 'filled value';
      }
    }
    expect(getPlanProgress(plan)).toBe(100);
  });

  it('returns correct partial percentage', () => {
    const plan = getDefaultPlan();
    const total = getAllPlanFieldIds().length;
    // Fill exactly 1 field
    const step = startBusinessSteps[0];
    const field = step.fields[0];
    (plan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>)[field.id] = 'filled';
    const expected = Math.round((1 / total) * 100);
    expect(getPlanProgress(plan)).toBe(expected);
  });

  it('does not count whitespace-only values as filled', () => {
    const plan = getDefaultPlan();
    const step = startBusinessSteps[0];
    const field = step.fields[0];
    (plan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>)[field.id] = '   ';
    expect(countFilledFields(plan)).toBe(0);
  });
});

// ─── Storage parsing ──────────────────────────────────────────────────────────

describe('parsePlanFromStorage', () => {
  it('returns default plan for null input', () => {
    const plan = parsePlanFromStorage(null);
    expect(getPlanProgress(plan)).toBe(0);
    expect(plan._version).toBe(START_BUSINESS_STORAGE_VERSION);
  });

  it('returns default plan for empty string', () => {
    const plan = parsePlanFromStorage('');
    expect(getPlanProgress(plan)).toBe(0);
  });

  it('returns default plan for malformed JSON', () => {
    const plan = parsePlanFromStorage('{ not json }');
    expect(getPlanProgress(plan)).toBe(0);
    expect(plan._version).toBe(START_BUSINESS_STORAGE_VERSION);
  });

  it('returns default plan for non-object JSON', () => {
    expect(getPlanProgress(parsePlanFromStorage('null'))).toBe(0);
    expect(getPlanProgress(parsePlanFromStorage('"a string"'))).toBe(0);
    expect(getPlanProgress(parsePlanFromStorage('42'))).toBe(0);
  });

  it('parses valid stored data correctly', () => {
    const defaultPlan = getDefaultPlan();
    const step = startBusinessSteps[0];
    const field = step.fields[0];
    (defaultPlan[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>)[field.id] = 'Test Value';
    const raw = JSON.stringify(defaultPlan);
    const parsed = parsePlanFromStorage(raw);
    expect((parsed[step.id as keyof StartBusinessPlan] as unknown as Record<string, string>)[field.id]).toBe('Test Value');
  });

  it('unknown fields in stored data do not crash parsing', () => {
    const raw = JSON.stringify({
      _version: 1,
      step1: { workingName: 'My Biz', unknownField: 'should be ignored', oneSentenceIdea: '', problemBeingSolved: '', proposedSolution: '' },
      step999: { someField: 'some value' }, // unknown step
    });
    expect(() => parsePlanFromStorage(raw)).not.toThrow();
    const parsed = parsePlanFromStorage(raw);
    expect((parsed.step1 as unknown as Record<string, string>).workingName).toBe('My Biz');
  });

  it('missing steps in stored data are filled with defaults', () => {
    const raw = JSON.stringify({ _version: 1, step1: { workingName: 'Only Step 1' } });
    const parsed = parsePlanFromStorage(raw);
    // step2 should have empty defaults
    expect((parsed.step2 as unknown as Record<string, string>).targetCustomer).toBe('');
  });

  it('non-string field values in stored data do not override defaults', () => {
    const raw = JSON.stringify({
      _version: 1,
      step1: { workingName: 123, oneSentenceIdea: null, problemBeingSolved: [], proposedSolution: {} },
    });
    const parsed = parsePlanFromStorage(raw);
    expect((parsed.step1 as unknown as Record<string, string>).workingName).toBe('');
  });

  it('storage key constant is correct', () => {
    expect(START_BUSINESS_STORAGE_KEY).toBe('ownward_start_business_plan_v1');
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────

describe('exportPlanAsText', () => {
  it('includes the plan title', () => {
    const plan = getDefaultPlan();
    const text = exportPlanAsText(plan);
    expect(text).toContain('OWNWARD STARTUP PLAN');
  });

  it('includes each step title', () => {
    const plan = getDefaultPlan();
    const text = exportPlanAsText(plan);
    for (const step of startBusinessSteps) {
      expect(text).toContain(step.title);
    }
  });

  it('does not include internal _version field in text output', () => {
    const plan = getDefaultPlan();
    const text = exportPlanAsText(plan);
    expect(text).not.toContain('_version');
  });

  it('includes filled values in the text output', () => {
    const plan = getDefaultPlan();
    (plan.step1 as unknown as Record<string, string>).workingName = 'Bright Paws Pet Services';
    const text = exportPlanAsText(plan);
    expect(text).toContain('Bright Paws Pet Services');
  });
});

describe('exportPlanAsJson', () => {
  it('produces valid JSON', () => {
    const plan = getDefaultPlan();
    expect(() => JSON.parse(exportPlanAsJson(plan))).not.toThrow();
  });

  it('does not include _version in the exported JSON', () => {
    const plan = getDefaultPlan();
    const json = exportPlanAsJson(plan);
    const parsed = JSON.parse(json);
    expect(parsed).not.toHaveProperty('_version');
  });

  it('uses step titles as keys in the exported JSON', () => {
    const plan = getDefaultPlan();
    const json = exportPlanAsJson(plan);
    const parsed = JSON.parse(json);
    for (const step of startBusinessSteps) {
      expect(parsed).toHaveProperty(step.title);
    }
  });

  it('includes filled values in the JSON output', () => {
    const plan = getDefaultPlan();
    (plan.step1 as unknown as Record<string, string>).workingName = 'Acme Co';
    const json = exportPlanAsJson(plan);
    expect(json).toContain('Acme Co');
  });
});

// ─── Reset ────────────────────────────────────────────────────────────────────

describe('getDefaultPlan (reset)', () => {
  it('reset returns the default empty plan', () => {
    const filled = getDefaultPlan();
    (filled.step1 as unknown as Record<string, string>).workingName = 'Something';
    const reset = getDefaultPlan();
    expect((reset.step1 as unknown as Record<string, string>).workingName).toBe('');
    expect(getPlanProgress(reset)).toBe(0);
  });
});
