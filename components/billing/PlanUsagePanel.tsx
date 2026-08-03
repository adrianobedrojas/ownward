import type { BillingPlan, PlanEntitlements } from '@/lib/billing';
import { UsageMeter } from './UsageMeter';
import { PlanBadge } from './PlanBadge';

interface UsageData {
  businesses: number;
  listings: number;
  listingImages: number;
  activeLeads: number;
  documents: number;
  storageBytes: number;
  milestonesThisMonth: number;
  savedListings: number;
}

interface PlanUsagePanelProps {
  plan: BillingPlan;
  entitlements: PlanEntitlements;
  usage: UsageData;
}

/**
 * Server-derived usage panel showing current plan, plan badge, and usage meters.
 * Data must come from server-side billing/usage queries — never trust client-supplied values.
 */
export function PlanUsagePanel({ plan, entitlements, usage }: PlanUsagePanelProps) {
  const storageUsedMB = Math.round(usage.storageBytes / (1024 * 1024));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-300">Your Plan</h2>
        <PlanBadge plan={plan} />
      </div>

      <div className="space-y-4">
        <UsageMeter
          label="Business Workspaces"
          current={usage.businesses}
          limit={entitlements.businessLimit}
        />
        <UsageMeter
          label="Listings"
          current={usage.listings}
          limit={entitlements.listingLimit}
        />
        {usage.listingImages > 0 && (
          <UsageMeter
            label="Listing Photos"
            current={usage.listingImages}
            limit={entitlements.listingImageLimit}
          />
        )}
        <UsageMeter
          label="Active Leads"
          current={usage.activeLeads}
          limit={entitlements.leadLimit}
        />
        <UsageMeter
          label="Documents"
          current={usage.documents}
          limit={entitlements.documentLimit}
        />
        <UsageMeter
          label="Storage"
          current={storageUsedMB}
          limit={Math.round(entitlements.storageBytes / (1024 * 1024))}
          unit="MB"
        />
        <UsageMeter
          label="Milestones this month"
          current={usage.milestonesThisMonth}
          limit={entitlements.milestoneMonthlyLimit}
        />
        <UsageMeter
          label="Saved Listings"
          current={usage.savedListings}
          limit={entitlements.savedListingLimit}
        />
      </div>
    </div>
  );
}
