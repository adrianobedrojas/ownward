/**
 * Ownward Value Center Tests
 *
 * Covers: navigation, homepage CTA, redirects, entitlements, and
 * EN/ES message-key parity for the Valuation and Tools sections.
 */

import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

// ─── Message key parity helpers ───────────────────────────────────────────────

function collectLeafKeys(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      keys.push(path);
    } else if (typeof v === 'object' && v !== null) {
      keys.push(...collectLeafKeys(v, path));
    } else {
      keys.push(path);
    }
  }
  return keys;
}

// ─── EN/ES message key parity ─────────────────────────────────────────────────

describe('EN/ES message key parity', () => {
  it('Navigation section has the same keys in EN and ES', () => {
    const enKeys = collectLeafKeys(enMessages.Navigation).sort();
    const esKeys = collectLeafKeys(esMessages.Navigation).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('Valuation section has the same keys in EN and ES', () => {
    const enKeys = collectLeafKeys(enMessages.Valuation).sort();
    const esKeys = collectLeafKeys(esMessages.Valuation).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('Home.assessment section has the same keys in EN and ES', () => {
    const enKeys = collectLeafKeys(enMessages.Home.assessment).sort();
    const esKeys = collectLeafKeys(esMessages.Home.assessment).sort();
    expect(esKeys).toEqual(enKeys);
  });
});

// ─── Tools navigation keys ────────────────────────────────────────────────────

describe('Tools navigation keys', () => {
  it('EN Navigation has tools dropdown label', () => {
    expect(enMessages.Navigation.tools).toBeTruthy();
  });

  it('ES Navigation has tools dropdown label', () => {
    expect(esMessages.Navigation.tools).toBeTruthy();
  });

  it('EN Navigation has Value My Business as first tools item', () => {
    expect(enMessages.Navigation.toolsMenuValueMyBusinessLabel).toBe('Value My Business');
  });

  it('ES Navigation has Value My Business equivalent', () => {
    expect(esMessages.Navigation.toolsMenuValueMyBusinessLabel).toBeTruthy();
  });

  it('EN Navigation has all four tools with descriptions', () => {
    const nav = enMessages.Navigation as Record<string, string>;
    expect(nav.toolsMenuValueMyBusinessDescription).toBeTruthy();
    expect(nav.toolsMenuSaleReadinessDescription).toBeTruthy();
    expect(nav.toolsMenuGrowthPlannerDescription).toBeTruthy();
    expect(nav.toolsMenuCustomerConcentrationDescription).toBeTruthy();
  });
});

// ─── Homepage assessment section ─────────────────────────────────────────────

describe('Homepage assessment / Value Center section', () => {
  it('EN assessment.badge is "Ownward Value Center"', () => {
    const assessment = enMessages.Home.assessment as Record<string, string>;
    expect(assessment.badge).toBe('Ownward Value Center');
  });

  it('ES assessment.badge is "Centro de Valor Ownward"', () => {
    const assessment = esMessages.Home.assessment as Record<string, string>;
    expect(assessment.badge).toBe('Centro de Valor Ownward');
  });

  it('EN assessment.cta is "Get my quick estimate"', () => {
    const assessment = enMessages.Home.assessment as Record<string, string>;
    expect(assessment.cta).toBe('Get my quick estimate');
  });

  it('EN assessment.cta does not mention sale readiness as free', () => {
    const assessment = enMessages.Home.assessment as Record<string, string>;
    const ctaLower = assessment.cta.toLowerCase();
    expect(ctaLower).not.toContain('sale-readiness');
    expect(ctaLower).not.toContain('sale readiness');
    // Should NOT say "Take the free sale-readiness check"
    expect(ctaLower).not.toContain('take the free');
  });

  it('EN assessment has a secondary CTA', () => {
    const assessment = enMessages.Home.assessment as Record<string, string>;
    expect(assessment.secondaryCta).toBeTruthy();
  });
});

// ─── Valuation modes ─────────────────────────────────────────────────────────

describe('Valuation mode configuration', () => {
  it('EN Valuation has quick, detailed, and reports modes', () => {
    const modes = enMessages.Valuation.modes as Record<string, string>;
    expect(modes.quick).toBeTruthy();
    expect(modes.detailed).toBeTruthy();
    expect(modes.reports).toBeTruthy();
  });

  it('ES Valuation has quick, detailed, and reports modes', () => {
    const modes = esMessages.Valuation.modes as Record<string, string>;
    expect(modes.quick).toBeTruthy();
    expect(modes.detailed).toBeTruthy();
    expect(modes.reports).toBeTruthy();
  });
});

// ─── Valuation disclaimers ────────────────────────────────────────────────────

describe('Valuation disclaimers', () => {
  it('EN rangeNote says "range, not a promise"', () => {
    expect(enMessages.Valuation.rangeNote).toContain('range, not a promise');
  });

  it('ES rangeNote says "rango, no una promesa"', () => {
    expect(esMessages.Valuation.rangeNote).toContain('rango, no una promesa');
  });

  it('EN disclaimer marks it as not a certified appraisal', () => {
    const disclaimer = enMessages.Valuation.disclaimer as Record<string, string>;
    expect(disclaimer.body).toContain('certified appraisal');
  });

  it('ES disclaimer marks it as not a certified appraisal', () => {
    const disclaimer = esMessages.Valuation.disclaimer as Record<string, string>;
    expect(disclaimer.body).toContain('tasación certificada');
  });
});

// ─── Entitlement messages ─────────────────────────────────────────────────────

describe('Valuation entitlement messages', () => {
  it('EN actions.upgradeRequired confirms free access', () => {
    const actions = enMessages.Valuation.actions as Record<string, string>;
    expect(actions.upgradeRequired.toLowerCase()).toContain('free account');
  });

  it('EN saveEstimateUpgradeRequired confirms free access', () => {
    const actions = enMessages.Valuation.actions as Record<string, string>;
    expect(actions.saveEstimateUpgradeRequired.toLowerCase()).toContain('free account');
  });

  it('EN tiers describes all four tiers', () => {
    const tiers = enMessages.Valuation.tiers as Record<string, string>;
    expect(tiers.free).toBeTruthy();
    expect(tiers.starter).toBeTruthy();
    expect(tiers.builder).toBeTruthy();
    expect(tiers.pro).toBeTruthy();
  });
});

// ─── My Reports section ───────────────────────────────────────────────────────

describe('My Reports section messages', () => {
  it('EN myReports has statusDraft, statusCompleted, statusArchived text labels', () => {
    const mr = enMessages.Valuation.myReports as Record<string, string>;
    expect(mr.statusDraft).toBeTruthy();
    expect(mr.statusCompleted).toBeTruthy();
    expect(mr.statusArchived).toBeTruthy();
  });

  it('EN myReports has emptyTitle and emptyDescription for empty state', () => {
    const mr = enMessages.Valuation.myReports as Record<string, string>;
    expect(mr.emptyTitle).toBeTruthy();
    expect(mr.emptyDescription).toBeTruthy();
  });

  it('EN myReports has actionContinue, actionOpen, actionArchive', () => {
    const mr = enMessages.Valuation.myReports as Record<string, string>;
    expect(mr.actionContinue).toBeTruthy();
    expect(mr.actionOpen).toBeTruthy();
    expect(mr.actionArchive).toBeTruthy();
  });
});

// ─── Entitlements (billing) ───────────────────────────────────────────────────

describe('saveEstimate server-side entitlement', () => {
  it('free plan has valuationLevel of "enhanced"', async () => {
    const { getEntitlementsByPlan } = await import('@/lib/billing');
    const ent = getEntitlementsByPlan('free');
    expect(ent.valuationLevel).toBe('enhanced');
  });

  it('starter plan has valuationLevel of "enhanced"', async () => {
    const { getEntitlementsByPlan } = await import('@/lib/billing');
    const ent = getEntitlementsByPlan('starter');
    expect(ent.valuationLevel).toBe('enhanced');
  });

  it('builder plan has valuationLevel of "enhanced"', async () => {
    const { getEntitlementsByPlan } = await import('@/lib/billing');
    const ent = getEntitlementsByPlan('builder');
    expect(ent.valuationLevel).toBe('enhanced');
  });

  it('pro plan has valuationLevel of "enhanced"', async () => {
    const { getEntitlementsByPlan } = await import('@/lib/billing');
    const ent = getEntitlementsByPlan('pro');
    expect(ent.valuationLevel).toBe('enhanced');
  });
});

// ─── Quick Snapshot guest access ─────────────────────────────────────────────

describe('Quick Value Snapshot messages', () => {
  it('EN quickSnapshot.guestNote says it is not saved and no account required', () => {
    const qs = enMessages.Valuation.quickSnapshot as Record<string, string>;
    expect(qs.guestNote).toContain('not saved');
    expect(qs.guestNote).toContain('No account required');
  });

  it('EN quickSnapshot.disclaimer says educational planning scenario', () => {
    const qs = enMessages.Valuation.quickSnapshot as Record<string, string>;
    expect(qs.disclaimer.toLowerCase()).toContain('educational');
  });
});

// ─── Detailed report stage list ───────────────────────────────────────────────

describe('Detailed report stages', () => {
  it('EN detailedReport.stageList has 7 stages', () => {
    const dr = enMessages.Valuation.detailedReport as Record<string, unknown>;
    expect(Array.isArray(dr.stageList)).toBe(true);
    expect((dr.stageList as string[]).length).toBe(7);
  });

  it('ES detailedReport.stageList has 7 stages', () => {
    const dr = esMessages.Valuation.detailedReport as Record<string, unknown>;
    expect(Array.isArray(dr.stageList)).toBe(true);
    expect((dr.stageList as string[]).length).toBe(7);
  });
});

// ─── Before you begin ────────────────────────────────────────────────────────

describe('Before you begin panel', () => {
  it('EN beforeYouBegin has quick and detailed needs', () => {
    const byb = enMessages.Valuation.beforeYouBegin as Record<string, string>;
    expect(byb.quickNeed1).toBeTruthy();
    expect(byb.quickNeed2).toBeTruthy();
    expect(byb.detailedNeed1).toBeTruthy();
  });

  it('ES beforeYouBegin has quick and detailed needs', () => {
    const byb = esMessages.Valuation.beforeYouBegin as Record<string, string>;
    expect(byb.quickNeed1).toBeTruthy();
    expect(byb.quickNeed2).toBeTruthy();
    expect(byb.detailedNeed1).toBeTruthy();
  });
});

// ─── What items list ─────────────────────────────────────────────────────────

describe('What you get items', () => {
  it('EN what.items has 9 items', () => {
    const w = enMessages.Valuation.what as Record<string, unknown>;
    expect(Array.isArray(w.items)).toBe(true);
    expect((w.items as string[]).length).toBe(9);
  });

  it('ES what.items has same count as EN', () => {
    const enW = enMessages.Valuation.what as Record<string, unknown>;
    const esW = esMessages.Valuation.what as Record<string, unknown>;
    expect((esW.items as string[]).length).toBe((enW.items as string[]).length);
  });
});
