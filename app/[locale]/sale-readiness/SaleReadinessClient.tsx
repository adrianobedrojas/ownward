'use client';

import { useState } from 'react';
import { computeSaleReadiness, buildActionPlan, estimateTimelineMonths } from '@/lib/sale-readiness/engine';
import type { SaleReadinessInput, SaleReadinessResult } from '@/lib/sale-readiness/engine';

interface Business {
  id: string;
  name: string;
  profile_completion: number;
}

interface Assessment {
  id: string;
  business_id: string;
  overall_score: number;
  stage: string;
  scored_at: string;
}

interface Props {
  businesses: Business[];
  recentAssessments: Assessment[];
  userId: string;
}

const EMPTY_INPUT: SaleReadinessInput = {
  hasThreeYearFinancials: false,
  hasCleanBooks: false,
  revenueGrowthPositive: null,
  ebitdaMarginPct: null,
  hasAuditedFinancials: false,
  hasRecentTaxReturns: false,
  hasMonthlyPnl: false,
  hasBankStatements: false,
  topCustomerRevenuePct: null,
  top5CustomerRevenuePct: null,
  customerCount: null,
  recurringRevenuePct: null,
  hasActiveContracts: false,
  avgContractLengthMonths: null,
  ownerHoursPerWeek: null,
  hasDocumentedProcesses: false,
  hasSecondInCommand: false,
  hasOperationsManual: false,
  hasVendorContracts: false,
  hasKeySystemsDocumented: false,
  hasFormationDocs: false,
  hasCleanCapTable: false,
  hasActiveIpProtection: null,
  hasNoMajorLitigation: true,
  hasKeyEmployeeContracts: false,
  avgEmployeeTenureYears: null,
  hasSuccessionPlan: false,
  hasTechDocumentation: false,
  hasAutomatedProcesses: false,
  hasCyberSecurityMeasures: false,
  hasValuationReport: false,
  hasListingOrTeaserDoc: false,
  hasNdaTemplate: false,
  hasIdentifiedBuyerProfiles: false,
};

const SCORE_COLOR = (score: number) => {
  if (score >= 75) return 'text-emerald-400';
  if (score >= 50) return 'text-cyan-400';
  if (score >= 25) return 'text-amber-400';
  return 'text-rose-400';
};

const RISK_COLOR: Record<string, string> = {
  none: 'text-emerald-400',
  low: 'text-cyan-400',
  medium: 'text-amber-400',
  high: 'text-orange-400',
  critical: 'text-rose-500',
};

export default function SaleReadinessClient({
  businesses,
  recentAssessments,
}: Props) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(
    businesses[0]?.id ?? ''
  );
  const [input, setInput] = useState<SaleReadinessInput>({ ...EMPTY_INPUT });
  const [result, setResult] = useState<SaleReadinessResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const latestAssessmentForBusiness = recentAssessments.find(
    (a) => a.business_id === selectedBusinessId
  );

  const handleCompute = () => {
    const previousScore = latestAssessmentForBusiness?.overall_score ?? null;
    const res = computeSaleReadiness(input, previousScore);
    setResult(res);
  };

  const handleSave = async () => {
    if (!result || !selectedBusinessId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch('/api/pro/sale-readiness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBusinessId,
          input,
          result,
        }),
      });
      if (res.ok) {
        setSaveMessage('Assessment saved successfully.');
      } else {
        const data = await res.json();
        setSaveMessage(data.error ?? 'Failed to save assessment.');
      }
    } catch {
      setSaveMessage('An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const setBool = (key: keyof SaleReadinessInput, value: boolean) => {
    setInput((prev) => ({ ...prev, [key]: value }));
  };

  const setNumber = (key: keyof SaleReadinessInput, raw: string) => {
    const n = raw === '' ? null : parseFloat(raw);
    setInput((prev) => ({ ...prev, [key]: isNaN(n as number) ? null : n }));
  };

  const actionPlan = result ? buildActionPlan(result) : [];
  const timeline = result ? estimateTimelineMonths(result.overallScore) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-cyan-300">Sale-Readiness Assessment</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Evaluate your business across 10 categories and get a transparent 0–100 readiness score.
          This tool is for planning purposes only — it is not a professional appraisal, audit, or legal opinion.
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
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {latestAssessmentForBusiness && (
        <div className="mb-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-sm text-cyan-200">
          Last assessment: <strong>{latestAssessmentForBusiness.overall_score}/100</strong>{' '}
          on {new Date(latestAssessmentForBusiness.scored_at).toLocaleDateString()}
        </div>
      )}

      {/* Input form */}
      <div className="space-y-8">
        {/* Financial Quality */}
        <Section title="Financial Quality">
          <BoolField label="3+ years of financial history" value={input.hasThreeYearFinancials} onChange={(v) => setBool('hasThreeYearFinancials', v)} />
          <BoolField label="Clean, organized bookkeeping" value={input.hasCleanBooks} onChange={(v) => setBool('hasCleanBooks', v)} />
          <BoolField label="Positive revenue growth trend" value={!!input.revenueGrowthPositive} onChange={(v) => setBool('revenueGrowthPositive', v)} />
          <NumberField label="EBITDA / profit margin %" value={input.ebitdaMarginPct} onChange={(v) => setNumber('ebitdaMarginPct', v)} />
        </Section>

        {/* Financial Documentation */}
        <Section title="Financial Documentation">
          <BoolField label="Last 2 years of tax returns" value={input.hasRecentTaxReturns} onChange={(v) => setBool('hasRecentTaxReturns', v)} />
          <BoolField label="Monthly P&L statements" value={input.hasMonthlyPnl} onChange={(v) => setBool('hasMonthlyPnl', v)} />
          <BoolField label="Bank statements" value={input.hasBankStatements} onChange={(v) => setBool('hasBankStatements', v)} />
          <BoolField label="Audited financials (optional bonus)" value={input.hasAuditedFinancials} onChange={(v) => setBool('hasAuditedFinancials', v)} />
        </Section>

        {/* Customer Diversification */}
        <Section title="Customer Diversification">
          <NumberField label="Top customer revenue %" value={input.topCustomerRevenuePct} onChange={(v) => setNumber('topCustomerRevenuePct', v)} />
          <NumberField label="Top 5 customers revenue %" value={input.top5CustomerRevenuePct} onChange={(v) => setNumber('top5CustomerRevenuePct', v)} />
          <NumberField label="Total active customers" value={input.customerCount} onChange={(v) => setNumber('customerCount', v)} />
        </Section>

        {/* Recurring Revenue */}
        <Section title="Recurring & Contracted Revenue">
          <NumberField label="Recurring revenue %" value={input.recurringRevenuePct} onChange={(v) => setNumber('recurringRevenuePct', v)} />
          <BoolField label="Active customer contracts" value={input.hasActiveContracts} onChange={(v) => setBool('hasActiveContracts', v)} />
          <NumberField label="Avg contract length (months)" value={input.avgContractLengthMonths} onChange={(v) => setNumber('avgContractLengthMonths', v)} />
        </Section>

        {/* Owner Independence */}
        <Section title="Owner Independence">
          <NumberField label="Owner hours per week in business" value={input.ownerHoursPerWeek} onChange={(v) => setNumber('ownerHoursPerWeek', v)} />
          <BoolField label="Documented operating procedures" value={input.hasDocumentedProcesses} onChange={(v) => setBool('hasDocumentedProcesses', v)} />
          <BoolField label="Second-in-command or management layer" value={input.hasSecondInCommand} onChange={(v) => setBool('hasSecondInCommand', v)} />
        </Section>

        {/* Operational Transferability */}
        <Section title="Operational Transferability">
          <BoolField label="Operations manual or runbook" value={input.hasOperationsManual} onChange={(v) => setBool('hasOperationsManual', v)} />
          <BoolField label="Vendor/supplier contracts" value={input.hasVendorContracts} onChange={(v) => setBool('hasVendorContracts', v)} />
          <BoolField label="Key systems documented" value={input.hasKeySystemsDocumented} onChange={(v) => setBool('hasKeySystemsDocumented', v)} />
        </Section>

        {/* Legal & Org Records */}
        <Section title="Legal & Org Records">
          <BoolField label="Formation documents" value={input.hasFormationDocs} onChange={(v) => setBool('hasFormationDocs', v)} />
          <BoolField label="Clean cap table / ownership records" value={input.hasCleanCapTable} onChange={(v) => setBool('hasCleanCapTable', v)} />
          <BoolField label="No major litigation or disputes" value={input.hasNoMajorLitigation} onChange={(v) => setBool('hasNoMajorLitigation', v)} />
          <BoolField label="Active trademark, patent, or other IP protection" value={!!input.hasActiveIpProtection} onChange={(v) => setBool('hasActiveIpProtection', v)} />
        </Section>

        {/* Team Continuity */}
        <Section title="Team Continuity">
          <BoolField label="Key employee agreements in place" value={input.hasKeyEmployeeContracts} onChange={(v) => setBool('hasKeyEmployeeContracts', v)} />
          <NumberField label="Avg employee tenure (years)" value={input.avgEmployeeTenureYears} onChange={(v) => setNumber('avgEmployeeTenureYears', v)} />
          <BoolField label="Succession / continuity plan" value={input.hasSuccessionPlan} onChange={(v) => setBool('hasSuccessionPlan', v)} />
        </Section>

        {/* Technology & Process */}
        <Section title="Technology & Process Maturity">
          <BoolField label="Technology stack documented" value={input.hasTechDocumentation} onChange={(v) => setBool('hasTechDocumentation', v)} />
          <BoolField label="Automated or repeatable processes" value={input.hasAutomatedProcesses} onChange={(v) => setBool('hasAutomatedProcesses', v)} />
          <BoolField label="Basic cybersecurity measures" value={input.hasCyberSecurityMeasures} onChange={(v) => setBool('hasCyberSecurityMeasures', v)} />
        </Section>

        {/* Buyer Preparation */}
        <Section title="Buyer Preparation">
          <BoolField label="Business valuation report" value={input.hasValuationReport} onChange={(v) => setBool('hasValuationReport', v)} />
          <BoolField label="Listing or teaser document" value={input.hasListingOrTeaserDoc} onChange={(v) => setBool('hasListingOrTeaserDoc', v)} />
          <BoolField label="NDA template ready" value={input.hasNdaTemplate} onChange={(v) => setBool('hasNdaTemplate', v)} />
          <BoolField label="Identified target buyer profiles" value={input.hasIdentifiedBuyerProfiles} onChange={(v) => setBool('hasIdentifiedBuyerProfiles', v)} />
        </Section>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          onClick={handleCompute}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm"
        >
          Compute Score
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-12 space-y-8">
          {/* Overall score */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className={`text-5xl font-bold ${SCORE_COLOR(result.overallScore)}`}>
                  {result.overallScore}<span className="text-xl text-slate-400">/100</span>
                </div>
                <div className="mt-1 text-sm text-slate-300">{result.stageLabel}</div>
                {result.deltaFromPrevious !== null && (
                  <div className={`mt-1 text-sm ${result.deltaFromPrevious >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.deltaFromPrevious >= 0 ? '+' : ''}{result.deltaFromPrevious} from previous
                  </div>
                )}
              </div>
              {timeline && (
                <div className="text-right">
                  <div className="text-xs text-slate-400 mb-1">Estimated time to market</div>
                  <div className="text-lg font-semibold text-slate-200">
                    {timeline.minMonths}–{timeline.maxMonths} months
                  </div>
                  <div className="text-xs text-slate-400 max-w-48">{timeline.description}</div>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-400">Strongest: <span className="text-emerald-300">{result.categories.find(c => c.category === result.strongestCategory)?.label}</span></div>
              <div className="text-slate-400">Weakest: <span className="text-rose-300">{result.categories.find(c => c.category === result.weakestCategory)?.label}</span></div>
            </div>
          </div>

          {/* Category breakdown */}
          <div>
            <h2 className="text-lg font-semibold mb-4 text-slate-200">Category Breakdown</h2>
            <div className="space-y-3">
              {result.categories.map((cat) => (
                <div key={cat.category} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-200">{cat.label}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">Confidence: {cat.confidence}%</span>
                      <span className={`text-sm font-bold ${SCORE_COLOR(cat.score)}`}>{cat.score}/100</span>
                      <span className={`text-xs font-medium ${RISK_COLOR[cat.riskLevel]}`}>{cat.riskLevel.toUpperCase()}</span>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.score >= 75 ? 'bg-emerald-400' : cat.score >= 50 ? 'bg-cyan-400' : cat.score >= 25 ? 'bg-amber-400' : 'bg-rose-500'}`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  {cat.missingEvidence.length > 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                      Missing: {cat.missingEvidence.join(' · ')}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-slate-500">{cat.recommendedAction}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 30/60/90 action plan */}
          {actionPlan.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-slate-200">30/60/90-Day Action Plan</h2>
              <div className="space-y-2">
                {actionPlan.map((item, i) => (
                  <div key={i} className="rounded-xl border border-slate-700 bg-slate-900/80 p-4 flex items-start gap-4">
                    <div className={`text-xs font-bold rounded-full px-2 py-1 shrink-0 ${
                      item.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                      item.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-cyan-500/20 text-cyan-400'
                    }`}>
                      {item.horizon}-day
                    </div>
                    <div>
                      <div className="text-sm text-slate-200">{item.action}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{item.category.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-xs text-slate-500">
            <strong className="text-slate-400">Disclaimer:</strong> {result.disclaimer}
          </div>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving || !selectedBusinessId}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 py-3 rounded-xl text-sm disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Assessment'}
            </button>
            {saveMessage && (
              <span className="text-sm text-slate-300">{saveMessage}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <h2 className="text-base font-semibold text-slate-200 mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BoolField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer text-sm text-slate-300">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-cyan-400"
      />
      {label}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-slate-300">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-28 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-right text-slate-100"
      />
    </div>
  );
}
