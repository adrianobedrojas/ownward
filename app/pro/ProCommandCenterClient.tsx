'use client';

import type { ProNextBestAction } from '@/lib/pro/next-best-action';
import type { ValuationRefreshEligibility } from '@/lib/valuation/refresh';
import type { PlanEntitlements } from '@/lib/billing';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface Props {
  businesses: AnyRecord[];
  activeBusinessId: string | null;
  nextBestAction: ProNextBestAction;
  latestAssessment: AnyRecord | null;
  refreshEligibility: ValuationRefreshEligibility;
  latestConcentration: AnyRecord | null;
  pendingOfferCount: number;
  entitlements: PlanEntitlements;
  invitedCount: number;
}

const NBA_PRIORITY_COLORS = {
  critical: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
  high: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
  medium: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
  info: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
};

export default function ProCommandCenterClient({
  businesses,
  activeBusinessId,
  nextBestAction,
  latestAssessment,
  refreshEligibility,
  latestConcentration,
  pendingOfferCount,
  entitlements,
  invitedCount,
}: Props) {
  const activeBusiness = businesses.find((b) => b.id === activeBusinessId);
  const seatsAvailable = Math.max(0, entitlements.teamMemberLimit - invitedCount);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300">Pro Deal Command Center</h1>
          <p className="mt-1 text-sm text-slate-400">
            {activeBusiness ? `Active: ${activeBusiness.name}` : 'No business selected'}
          </p>
        </div>
        <div className="flex gap-3">
          <a href="/portfolio" className="text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500">
            Portfolio →
          </a>
          <a href="/seller" className="text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500">
            Seller Area →
          </a>
        </div>
      </div>

      {/* Next Best Action */}
      <div className={`rounded-2xl border p-6 mb-8 ${NBA_PRIORITY_COLORS[nextBestAction.priority]}`}>
        <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
          Next Best Action (Rule {nextBestAction.rule})
        </div>
        <h2 className="text-xl font-semibold mb-2">{nextBestAction.title}</h2>
        <p className="text-sm opacity-80 mb-4">{nextBestAction.description}</p>
        <a
          href={nextBestAction.href}
          className="inline-block bg-current text-slate-950 font-semibold text-sm px-4 py-2 rounded-lg hover:opacity-90"
          style={{ background: 'currentColor' }}
        >
          <span className="text-slate-950">{nextBestAction.cta}</span>
        </a>
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {/* Sale readiness */}
        <WidgetCard
          label="Sale Readiness"
          href="/sale-readiness"
          icon="📊"
          value={latestAssessment ? `${latestAssessment.overall_score}/100` : 'Not assessed'}
          sub={latestAssessment?.stage?.replace(/_/g, ' ') ?? 'Run your first assessment'}
          valueClass={
            !latestAssessment
              ? 'text-slate-500'
              : latestAssessment.overall_score >= 75
              ? 'text-emerald-400'
              : latestAssessment.overall_score >= 50
              ? 'text-cyan-400'
              : 'text-amber-400'
          }
        />

        {/* Valuation refresh */}
        <WidgetCard
          label="Valuation Refresh"
          href="/valuation"
          icon="💰"
          value={refreshEligibility.eligible ? 'Eligible' : 'Refresh available soon'}
          sub={
            !refreshEligibility.eligible
              ? `${refreshEligibility.hoursRemaining}h remaining`
              : 'Run your weekly refresh'
          }
          valueClass={refreshEligibility.eligible ? 'text-emerald-400' : 'text-slate-400'}
        />

        {/* Customer concentration */}
        <WidgetCard
          label="Concentration Risk"
          href="/customer-concentration"
          icon="🎯"
          value={latestConcentration?.concentration_risk_level?.toUpperCase() ?? 'No data'}
          sub="Customer revenue diversification"
          valueClass={
            !latestConcentration
              ? 'text-slate-500'
              : latestConcentration.concentration_risk_level === 'critical'
              ? 'text-rose-400'
              : latestConcentration.concentration_risk_level === 'high'
              ? 'text-orange-400'
              : latestConcentration.concentration_risk_level === 'moderate'
              ? 'text-amber-400'
              : 'text-emerald-400'
          }
        />

        {/* Pending offers */}
        <WidgetCard
          label="Pending Offers"
          href="/seller"
          icon="📋"
          value={String(pendingOfferCount)}
          sub={pendingOfferCount > 0 ? 'Awaiting review' : 'No offers pending'}
          valueClass={pendingOfferCount > 0 ? 'text-amber-400' : 'text-slate-500'}
        />

        {/* Team seats */}
        <WidgetCard
          label="Team Seats"
          href="/team"
          icon="👥"
          value={`${invitedCount} / ${entitlements.teamMemberLimit}`}
          sub={`${seatsAvailable} seat${seatsAvailable === 1 ? '' : 's'} available`}
          valueClass="text-slate-200"
        />

        {/* Deal rooms */}
        <WidgetCard
          label="Deal Room Limit"
          href="/deals"
          icon="🏛️"
          value={`Up to ${entitlements.activeDealRoomLimit}`}
          sub="active deal rooms"
          valueClass="text-slate-200"
        />

        {/* Documents */}
        <WidgetCard
          label="Documents"
          href="/documents"
          icon="📂"
          value={`${entitlements.documentLimit.toLocaleString()}`}
          sub="document limit"
          valueClass="text-slate-400"
        />

        {/* Seller area */}
        <WidgetCard
          label="Seller Pipeline"
          href="/seller"
          icon="🏁"
          value="View Pipeline"
          sub="Track your sale process"
          valueClass="text-cyan-400"
        />
      </div>

      {/* Pro feature links */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
        <h2 className="font-semibold text-slate-200 mb-4">Pro Features</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ProFeatureLink href="/sale-readiness" label="Sale-Readiness Assessment" />
          <ProFeatureLink href="/customer-concentration" label="Customer Concentration Lab" />
          <ProFeatureLink href="/valuation" label="Weekly Valuation Pulse" />
          <ProFeatureLink href="/seller" label="Seller Command Center" />
          <ProFeatureLink href="/portfolio" label="Business Portfolio" />
          <ProFeatureLink href="/deals" label="Deal Rooms (up to 3)" />
          <ProFeatureLink href="/team" label="Team Collaboration (5 seats)" />
          <ProFeatureLink href="/documents" label="Document Vault (1,000 docs)" />
        </div>
      </div>
    </div>
  );
}

function WidgetCard({
  label,
  href,
  icon,
  value,
  sub,
  valueClass = 'text-slate-100',
}: {
  label: string;
  href: string;
  icon: string;
  value: string;
  sub: string;
  valueClass?: string;
}) {
  return (
    <a
      href={href}
      className="rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 p-4 block transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{icon}</span>
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-lg font-bold ${valueClass}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </a>
  );
}

function ProFeatureLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline py-1"
    >
      → {label}
    </a>
  );
}
