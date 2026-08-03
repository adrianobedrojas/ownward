import fs from 'node:fs';
import path from 'node:path';
import en from '@/messages/en.json';
import es from '@/messages/es.json';
import { checkBusinessLimit, checkBookkeepingAccess, getEntitlementsByPlan } from '@/lib/billing';
import {
  ALL_PLAN_KEYS,
  PLAN_FINDER_GOALS,
  getComparisonValue,
  getPlanCardFeatures,
  getPricingRecommendationFromSearchParams,
} from '@/lib/pricing';

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Pricing integrations and workspace access', () => {
  it('shows supported standard integrations as included for every plan in the shared comparison catalog', () => {
    for (const plan of ALL_PLAN_KEYS) {
      expect(getComparisonValue(plan, 'integrations')).toEqual({
        type: 'boolean',
        included: true,
      });
    }
  });

  it('allows Explorer to create a first free business workspace', () => {
    const entitlements = getEntitlementsByPlan('free');
    expect(checkBusinessLimit(entitlements, 0)).toBeNull();
  });

  it('keeps free-plan entitlements unchanged even when pricing query params recommend a paid plan', () => {
    const recommendation = getPricingRecommendationFromSearchParams({ goal: 'sale-readiness' });
    expect(recommendation?.plan).toBe('pro');

    const entitlements = getEntitlementsByPlan('free');
    expect(entitlements.businessLimit).toBe(1);
    expect(checkBusinessLimit(entitlements, 0)).toBeNull();
  });
});

describe('Bookkeeping and plan recommendations', () => {
  it('uses Starter or higher wording for bookkeeping access', () => {
    const result = checkBookkeepingAccess(getEntitlementsByPlan('free'));
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.message).toContain('Starter or higher');
      expect(result.message).not.toContain('Builder or higher');
    }
  });

  it('exposes goal-based plan recommendations', () => {
    expect(PLAN_FINDER_GOALS.map((goal) => goal.key)).toEqual([
      'first-workspace',
      'bookkeeping',
      'team-growth',
      'sale-readiness',
    ]);
    expect(getPricingRecommendationFromSearchParams({ goal: 'first-workspace' })?.plan).toBe('free');
    expect(getPricingRecommendationFromSearchParams({ goal: 'bookkeeping' })?.plan).toBe('starter');
    expect(getPricingRecommendationFromSearchParams({ goal: 'team-growth' })?.plan).toBe('builder');
    expect(getPricingRecommendationFromSearchParams({ goal: 'sale-readiness' })?.plan).toBe('pro');
  });

  it('maps existing upgrade query params to plan recommendations', () => {
    expect(getPricingRecommendationFromSearchParams({ upgrade: 'seller' })).toEqual({
      plan: 'pro',
      source: 'upgrade',
    });
    expect(getPricingRecommendationFromSearchParams({ recommend: 'starter' })).toEqual({
      plan: 'starter',
      source: 'recommend',
    });
  });
});

describe('Pricing bilingual parity', () => {
  it('includes new taglines in English and Spanish', () => {
    expect(en.Pricing.plans.free.tagline).toBeTruthy();
    expect(en.Pricing.plans.starter.tagline).toBeTruthy();
    expect(en.Pricing.plans.builder.tagline).toBeTruthy();
    expect(en.Pricing.plans.pro.tagline).toBeTruthy();
    expect(es.Pricing.plans.free.tagline).toBeTruthy();
    expect(es.Pricing.plans.starter.tagline).toBeTruthy();
    expect(es.Pricing.plans.builder.tagline).toBeTruthy();
    expect(es.Pricing.plans.pro.tagline).toBeTruthy();
  });

  it('keeps PlanFinder and feature template keys aligned between English and Spanish', () => {
    expect(Object.keys(en.Pricing.planFinder.goals).sort()).toEqual(
      Object.keys(es.Pricing.planFinder.goals).sort()
    );
    expect(Object.keys(en.Pricing.featureTemplates).sort()).toEqual(
      Object.keys(es.Pricing.featureTemplates).sort()
    );
  });

  it('contains the included-in-every-plan copy in both locales', () => {
    expect(en.Pricing.includedInEveryPlan.description).toContain('included in every plan');
    expect(es.Pricing.includedInEveryPlan.description).toContain('incluidas en todos los planes');
  });
});

describe('Shared pricing catalog wiring', () => {
  it('keeps pricing card facts consistent with billing entitlements', () => {
    for (const plan of ALL_PLAN_KEYS) {
      const entitlements = getEntitlementsByPlan(plan);
      const features = getPlanCardFeatures(plan);
      expect(features.find((feature) => feature.key === 'workspaces')).toEqual({
        key: 'workspaces',
        count: entitlements.businessLimit,
      });
      expect(features.find((feature) => feature.key === 'integrations')).toEqual({
        key: 'integrations',
        included: true,
      });
    }
  });

  it('uses PlanFinder and shared pricing helpers in the pricing UI', () => {
    const pricingPage = read('app/[locale]/pricing/page.tsx');
    const pricingCards = read('app/[locale]/pricing/PricingCards.tsx');

    expect(pricingPage).toContain('getPricingRecommendationFromSearchParams');
    expect(pricingCards).toContain("from '@/lib/pricing'");
    expect(pricingCards).toContain('PlanFinder');
    expect(pricingCards).not.toContain('t.raw(`plans.${key}.features`)');
    expect(pricingCards).not.toContain("t(`comparison.values.");
  });

  it('ships the dedicated PlanFinder component', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'app/[locale]/pricing/PlanFinder.tsx'))).toBe(true);
  });
});

describe('Explorer messaging regression coverage', () => {
  it('removes the incorrect Explorer upgrade copy from business and dashboard pages', () => {
    const businessPage = read('app/[locale]/business/page.tsx');
    const dashboardPage = read('app/[locale]/dashboard/page.tsx');

    expect(businessPage).not.toContain('Upgrade to a Starter plan to create a business workspace.');
    expect(businessPage).not.toContain('Upgrade to Starter');
    expect(dashboardPage).not.toContain(
      'Upgrade to Starter to get your Business Passport, Milestone Trail, Health Check, Valuation, and more.'
    );
  });
});
