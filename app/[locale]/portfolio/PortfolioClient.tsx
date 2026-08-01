'use client';

import Link from 'next/link';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface Props {
  businesses: AnyRecord[];
  assessments: AnyRecord[];
  dealRooms: AnyRecord[];
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-rose-500',
};

export default function PortfolioClient({ businesses, assessments, dealRooms }: Props) {
  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);

  const getAssessment = (businessId: string) =>
    assessments.find((a) => a.business_id === businessId);

  const getActiveDealRooms = (businessId: string) =>
    dealRooms.filter((dr) => dr.business_id === businessId).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">Business Portfolio</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Overview of all your businesses with performance, readiness, and risk metrics.
        </p>
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-10 text-center text-slate-400">
          No businesses found.{' '}
          <Link
            href="/business/new"
            className="text-cyan-400 hover:underline"
          >
            Create your first business.
          </Link>
        </div>
      ) : (
        <>
          {/* Portfolio grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {businesses.map((biz) => {
              const assessment = getAssessment(biz.id);
              const activeRooms = getActiveDealRooms(biz.id);
              const readinessScore = assessment?.overall_score ?? null;

              return (
                <div
                  key={biz.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="font-semibold text-slate-100 text-lg">{biz.name}</h2>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {biz.industry ?? 'No industry'} · {biz.business_stage ?? 'Stage unknown'}
                      </div>
                    </div>
                    <a
                      href={`/business?id=${biz.id}`}
                      className="text-xs text-cyan-400 hover:underline"
                    >
                      Manage →
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Metric
                      label="Annual Revenue"
                      value={biz.annual_revenue ? fmt(Number(biz.annual_revenue)) : '—'}
                    />
                    <Metric
                      label="Profile"
                      value={`${biz.profile_completion ?? 0}%`}
                      className={
                        (biz.profile_completion ?? 0) < 50 ? 'text-amber-400' : 'text-emerald-400'
                      }
                    />
                    <Metric
                      label="Sale Readiness"
                      value={readinessScore !== null ? `${readinessScore}/100` : 'Not assessed'}
                      className={
                        readinessScore === null
                          ? 'text-slate-500'
                          : readinessScore >= 75
                          ? 'text-emerald-400'
                          : readinessScore >= 50
                          ? 'text-cyan-400'
                          : readinessScore >= 25
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }
                    />
                    <Metric
                      label="Active Deal Rooms"
                      value={String(activeRooms)}
                      className={activeRooms > 0 ? 'text-cyan-400' : 'text-slate-500'}
                    />
                  </div>

                  {/* Risk matrix */}
                  <div className="border-t border-slate-800 pt-3">
                    <div className="text-xs text-slate-400 mb-2">Risk Indicators</div>
                    <div className="flex flex-wrap gap-2">
                      {(biz.profile_completion ?? 0) < 50 && (
                        <RiskBadge label="Incomplete profile" level="high" />
                      )}
                      {readinessScore === null && (
                        <RiskBadge label="No readiness assessment" level="moderate" />
                      )}
                      {readinessScore !== null && readinessScore < 25 && (
                        <RiskBadge label="Critical readiness gap" level="critical" />
                      )}
                      {(biz.profile_completion ?? 0) >= 50 && readinessScore !== null && readinessScore >= 50 && (
                        <span className="text-xs text-emerald-400">✓ No critical risks detected</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Portfolio summary */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <h2 className="font-semibold text-slate-200 mb-4">Portfolio Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <Metric label="Total Businesses" value={String(businesses.length)} />
              <Metric
                label="Assessed"
                value={`${new Set(assessments.map((a) => a.business_id)).size} / ${businesses.length}`}
              />
              <Metric
                label="Total Active Deal Rooms"
                value={String(dealRooms.length)}
              />
              <Metric
                label="Avg Readiness"
                value={
                  assessments.length > 0
                    ? `${Math.round(
                        assessments.reduce((s, a) => s + a.overall_score, 0) / assessments.length
                      )}/100`
                    : '—'
                }
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  className = 'text-slate-100',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${className}`}>{value}</div>
    </div>
  );
}

function RiskBadge({
  label,
  level,
}: {
  label: string;
  level: 'critical' | 'high' | 'moderate' | 'low';
}) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full border ${
        level === 'critical'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          : level === 'high'
          ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      } ${RISK_COLOR[level]}`}
    >
      {label}
    </span>
  );
}
