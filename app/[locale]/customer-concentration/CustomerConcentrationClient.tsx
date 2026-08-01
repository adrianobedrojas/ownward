'use client';

import { useState, useMemo } from 'react';
import {
  computeConcentrationMetrics,
  modelScenario,
  type CustomerRecord,
  type ScenarioType,
} from '@/lib/customer-concentration';

interface Business { id: string; name: string; }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRecord = Record<string, any>;

interface Props {
  businesses: Business[];
  initialRecords: DbRecord[];
  userId: string;
}

function dbToCustomer(r: DbRecord): CustomerRecord {
  return {
    id: r.id,
    name: r.customer_alias ?? r.customer_name,
    annualRevenue: Number(r.annual_revenue ?? 0),
    isRecurring: r.is_recurring ?? false,
    hasActiveContract: r.has_active_contract ?? false,
    contractExpiryMonths: r.contract_expiry_months ?? null,
    isAtRisk: r.is_at_risk ?? false,
    deletedAt: r.deleted_at ?? null,
  };
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-emerald-400',
  moderate: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-rose-500',
};

const SCENARIOS: { key: ScenarioType; label: string }[] = [
  { key: 'lose_largest', label: 'Lose largest customer' },
  { key: 'lose_top3', label: 'Lose top 3 customers' },
  { key: 'reduce_largest_to_20pct', label: 'Reduce largest to 20%' },
  { key: 'reduce_largest_to_15pct', label: 'Reduce largest to 15%' },
  { key: 'add_diversified_source', label: 'Add 10% diversified revenue' },
  { key: 'extend_contracts', label: 'Extend expiring contracts' },
];

export default function CustomerConcentrationClient({
  businesses,
  initialRecords,
}: Props) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    businesses[0]?.id ?? ''
  );
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType | null>(null);

  const customers = useMemo(() => {
    return initialRecords
      .filter((r) => r.business_id === selectedBusinessId)
      .map(dbToCustomer);
  }, [initialRecords, selectedBusinessId]);

  const metrics = useMemo(() => computeConcentrationMetrics(customers), [customers]);
  const scenario = useMemo(
    () => (selectedScenario ? modelScenario(customers, selectedScenario) : null),
    [customers, selectedScenario]
  );

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">Customer Concentration Lab</h1>
        <p className="mt-2 text-slate-400 text-sm">
          Analyze how revenue is distributed across your customers and model diversification scenarios.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          <strong>Disclaimer:</strong> Scenarios are modeled estimates for planning only — not certified financial projections.
          HHI is a transparency metric with no regulatory meaning for small businesses.
        </p>
      </div>

      {/* Business selector */}
      {businesses.length > 1 && (
        <div className="mb-6">
          <label className="block text-xs text-slate-400 mb-1">Select Business</label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Metrics */}
      {metrics.customerCount === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-8 text-center text-slate-400">
          No customer revenue records found for this business.
          <br />
          <span className="text-xs mt-2 block">Add records via the Customer Revenue section below.</span>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Total Revenue" value={fmt(metrics.totalRevenue)} />
            <MetricCard label="Customers" value={String(metrics.customerCount)} />
            <MetricCard label="Largest Customer" value={`${metrics.largestCustomerPct.toFixed(1)}%`} />
            <MetricCard
              label="Concentration Risk"
              value={metrics.concentrationRiskLevel.toUpperCase()}
              className={RISK_COLOR[metrics.concentrationRiskLevel]}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Top 5 Customers" value={`${metrics.top5Pct.toFixed(1)}%`} />
            <MetricCard label="Top 10 Customers" value={`${metrics.top10Pct.toFixed(1)}%`} />
            <MetricCard label="Recurring Revenue" value={`${metrics.recurringRevenuePct.toFixed(1)}%`} />
            <MetricCard label="At-Risk Revenue" value={`${metrics.atRiskRevenuePct.toFixed(1)}%`} />
          </div>

          {/* HHI */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-slate-200">Concentration Index (HHI)</h3>
              <span className="text-sm font-bold text-cyan-300">{metrics.hhiLabel}</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400 mb-1">{metrics.hhiRaw.toFixed(0)}</div>
            <div className="text-xs text-slate-400">{metrics.hhiExplanation}</div>
          </div>

          {/* Risk summary */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 mb-8">
            <h3 className="font-medium text-slate-200 mb-2">Risk & Valuation Impact</h3>
            <p className="text-sm text-slate-300 mb-2">{metrics.retentionRiskSummary}</p>
            <p className="text-sm text-slate-400">{metrics.concentrationAdjustedValuationImpact}</p>
          </div>

          {/* Ranked customers */}
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 mb-8">
            <h3 className="font-medium text-slate-200 mb-4">Ranked Customers</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 text-xs border-b border-slate-700">
                    <th className="text-left pb-2">Rank</th>
                    <th className="text-left pb-2">Name</th>
                    <th className="text-right pb-2">Revenue</th>
                    <th className="text-right pb-2">%</th>
                    <th className="text-center pb-2">Recurring</th>
                    <th className="text-center pb-2">Contract</th>
                    <th className="text-center pb-2">At Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.rankedCustomers.slice(0, 20).map((c) => (
                    <tr key={c.id} className="border-b border-slate-800 text-slate-200">
                      <td className="py-2 text-slate-500">{c.rank}</td>
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 text-right">{fmt(c.annualRevenue)}</td>
                      <td className="py-2 text-right">{c.revenuePct.toFixed(1)}%</td>
                      <td className="py-2 text-center">{c.isRecurring ? '✓' : '—'}</td>
                      <td className="py-2 text-center">{c.hasActiveContract ? '✓' : '—'}</td>
                      <td className="py-2 text-center">{c.isAtRisk ? <span className="text-rose-400">!</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scenario modeling */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Scenario Modeling</h2>
            <p className="text-xs text-slate-500 mb-4">
              All scenarios are modeled estimates. They do not represent guaranteed future outcomes.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSelectedScenario(s.key === selectedScenario ? null : s.key)}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    selectedScenario === s.key
                      ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-semibold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {scenario && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="font-medium text-amber-300 mb-1">{scenario.label}</div>
                <p className="text-xs text-slate-500 mb-4">{scenario.disclaimer}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard label="Revenue Impact" value={
                    scenario.revenueImpactAmount === 0 ? 'No change'
                    : `${scenario.revenueImpactAmount > 0 ? '-' : '+'}${fmt(Math.abs(scenario.revenueImpactAmount))}`
                  } />
                  <MetricCard label="Resulting Total" value={fmt(scenario.resultingMetrics.totalRevenue)} />
                  <MetricCard label="Largest Customer" value={`${scenario.resultingMetrics.largestCustomerPct.toFixed(1)}%`} />
                  <MetricCard
                    label="Risk Level"
                    value={scenario.resultingMetrics.concentrationRiskLevel.toUpperCase()}
                    className={RISK_COLOR[scenario.resultingMetrics.concentrationRiskLevel]}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  className = 'text-slate-100',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-bold ${className}`}>{value}</div>
    </div>
  );
}
