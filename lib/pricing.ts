import type { BillingPlan } from '@/lib/billing';
import { getPlanCatalogEntry } from '@/lib/billing';

export const ALL_PLAN_KEYS = ['free', 'starter', 'builder', 'pro'] as const satisfies readonly BillingPlan[];

export type PricingComparisonRowKey =
  | 'workspaces'
  | 'listings'
  | 'milestones'
  | 'leads'
  | 'docsStorage'
  | 'valuationLevel'
  | 'bookkeeping'
  | 'integrations'
  | 'collaborators'
  | 'confidentialListings'
  | 'dealRooms'
  | 'support';

export const COMPARISON_ROW_KEYS = [
  'workspaces',
  'listings',
  'milestones',
  'leads',
  'docsStorage',
  'valuationLevel',
  'bookkeeping',
  'integrations',
  'collaborators',
  'confidentialListings',
  'dealRooms',
  'support',
] as const satisfies readonly PricingComparisonRowKey[];

export type PricingCardFeature =
  | { key: 'workspaces'; count: number }
  | { key: 'milestones'; count: number }
  | { key: 'health'; level: 'snapshot' | 'checklist' | 'advanced' }
  | { key: 'valuation'; level: 'preview' | 'basic' | 'detailed' | 'enhanced' }
  | { key: 'documentsStorage'; documents: number; storageBytes: number }
  | { key: 'leads'; count: number }
  | { key: 'savedListings'; count: number }
  | { key: 'comparison'; count: number }
  | { key: 'listings'; count: number; photos: number; confidential: boolean }
  | { key: 'bookkeeping'; included: boolean }
  | { key: 'collaborators'; count: number }
  | { key: 'support'; level: 'community' | 'standard' | 'priority' }
  | { key: 'dealRooms'; count: number }
  | { key: 'saleReadiness'; included: boolean }
  | { key: 'customerConcentration'; included: boolean }
  | { key: 'sellerCommandCenter'; included: boolean }
  | { key: 'integrations'; included: boolean };

export type PricingComparisonValue =
  | { type: 'count'; count: number }
  | { type: 'listings'; count: number; publicOnly: boolean }
  | { type: 'docsStorage'; documents: number; storageBytes: number }
  | { type: 'valuation'; level: 'preview' | 'basic' | 'detailed' | 'enhanced' }
  | { type: 'boolean'; included: boolean }
  | { type: 'dealRooms'; count: number }
  | { type: 'support'; level: 'community' | 'standard' | 'priority' };

export const PLAN_FINDER_GOALS = [
  { key: 'first-workspace', recommendedPlan: 'free' },
  { key: 'capacity-growth', recommendedPlan: 'starter' },
  { key: 'multi-business', recommendedPlan: 'builder' },
  { key: 'deal-automation-support', recommendedPlan: 'pro' },
] as const satisfies readonly { key: string; recommendedPlan: BillingPlan }[];

export type PlanRecommendationGoal = (typeof PLAN_FINDER_GOALS)[number]['key'];

export type PricingRecommendation = {
  plan: BillingPlan;
  source: 'goal' | 'recommend' | 'upgrade';
  goal?: PlanRecommendationGoal;
};

const RECOMMENDABLE_PLANS = new Set<BillingPlan>(ALL_PLAN_KEYS);

const UPGRADE_RECOMMENDATIONS: Record<string, BillingPlan> = {
  'pro-command-center': 'pro',
  portfolio: 'pro',
  team: 'builder',
  capacity: 'starter',
  'deal-rooms': 'pro',
};

function isBillingPlan(value: string): value is BillingPlan {
  return RECOMMENDABLE_PLANS.has(value as BillingPlan);
}

function getPlanHealthLevel(plan: BillingPlan): PricingCardFeature {
  const { entitlements } = getPlanCatalogEntry(plan);
  return {
    key: 'health',
    level:
      entitlements.healthLevel === 'advanced'
        ? 'advanced'
        : entitlements.healthLevel === 'basic'
          ? 'checklist'
          : 'snapshot',
  };
}

function getPlanValuationLevel(plan: BillingPlan): PricingCardFeature {
  const { entitlements } = getPlanCatalogEntry(plan);
  return { key: 'valuation', level: entitlements.valuationLevel };
}

export function getPlanCardFeatures(plan: BillingPlan): PricingCardFeature[] {
  const { entitlements } = getPlanCatalogEntry(plan);

  const features: PricingCardFeature[] = [
    { key: 'workspaces', count: entitlements.businessLimit },
    { key: 'milestones', count: entitlements.milestoneMonthlyLimit },
    getPlanHealthLevel(plan),
    getPlanValuationLevel(plan),
    {
      key: 'documentsStorage',
      documents: entitlements.documentLimit,
      storageBytes: entitlements.storageBytes,
    },
    { key: 'leads', count: entitlements.leadLimit },
    { key: 'savedListings', count: entitlements.savedListingLimit },
    { key: 'comparison', count: entitlements.listingComparisonLimit },
    {
      key: 'listings',
      count: entitlements.listingLimit,
      photos: entitlements.listingImageLimit,
      confidential: entitlements.confidentialListings,
    },
    { key: 'integrations', included: true },
  ];

  if (entitlements.bookkeeping) {
    features.push({ key: 'bookkeeping', included: true });
  }

  if (entitlements.teamMemberLimit > 0) {
    features.push({ key: 'collaborators', count: entitlements.teamMemberLimit });
  }

  if (entitlements.saleReadiness) features.push({ key: 'saleReadiness', included: true });
  if (entitlements.customerConcentration) features.push({ key: 'customerConcentration', included: true });
  if (entitlements.sellerCommandCenter) features.push({ key: 'sellerCommandCenter', included: true });

  if (entitlements.activeDealRoomLimit > 0) {
    features.push({ key: 'dealRooms', count: entitlements.activeDealRoomLimit });
  }

  features.push({
    key: 'support',
    level:
      entitlements.supportLevel === 'priority'
        ? 'priority'
        : entitlements.supportLevel === 'standard'
          ? 'standard'
          : 'community',
  });

  return features;
}

export function getComparisonValue(
  plan: BillingPlan,
  row: PricingComparisonRowKey
): PricingComparisonValue {
  const { entitlements } = getPlanCatalogEntry(plan);

  switch (row) {
    case 'workspaces':
      return { type: 'count', count: entitlements.businessLimit };
    case 'listings':
      return {
        type: 'listings',
        count: entitlements.listingLimit,
        publicOnly: !entitlements.confidentialListings,
      };
    case 'milestones':
      return { type: 'count', count: entitlements.milestoneMonthlyLimit };
    case 'leads':
      return { type: 'count', count: entitlements.leadLimit };
    case 'docsStorage':
      return {
        type: 'docsStorage',
        documents: entitlements.documentLimit,
        storageBytes: entitlements.storageBytes,
      };
    case 'valuationLevel':
      return {
        type: 'valuation',
        level: entitlements.valuationLevel,
      };
    case 'bookkeeping':
      return { type: 'boolean', included: entitlements.bookkeeping };
    case 'integrations':
      return { type: 'boolean', included: true };
    case 'collaborators':
      return { type: 'count', count: entitlements.teamMemberLimit };
    case 'confidentialListings':
      return { type: 'boolean', included: entitlements.confidentialListings };
    case 'dealRooms':
      return { type: 'dealRooms', count: entitlements.activeDealRoomLimit };
    case 'support':
      return {
        type: 'support',
        level:
          entitlements.supportLevel === 'priority'
            ? 'priority'
            : entitlements.supportLevel === 'standard'
              ? 'standard'
              : 'community',
      };
  }
}

export function getPricingRecommendationFromSearchParams(searchParams: {
  goal?: string;
  recommend?: string;
  upgrade?: string;
}): PricingRecommendation | null {
  const goal = String(searchParams.goal ?? '').trim().toLowerCase();
  const recommendedPlan = String(searchParams.recommend ?? '').trim().toLowerCase();
  const upgrade = String(searchParams.upgrade ?? '').trim().toLowerCase();

  const goalMatch = PLAN_FINDER_GOALS.find((entry) => entry.key === goal);
  if (goalMatch) {
    return {
      plan: goalMatch.recommendedPlan,
      source: 'goal',
      goal: goalMatch.key,
    };
  }

  if (isBillingPlan(recommendedPlan)) {
    return {
      plan: recommendedPlan,
      source: 'recommend',
    };
  }

  if (upgrade && upgrade in UPGRADE_RECOMMENDATIONS) {
    return {
      plan: UPGRADE_RECOMMENDATIONS[upgrade],
      source: 'upgrade',
    };
  }

  return null;
}
